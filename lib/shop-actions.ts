// Bag and checkout requests from a visiting agent, run in code rather than by the chat model.
// Everything else goes to Leo.
import type { CartItem, Product, ProductVariant } from '@/types'
import type { CapCaller } from '@/lib/cap'
import { buildCartKey, changeCart, getCart } from '@/lib/carts'
import { getMetafieldValue, getProducts } from '@/lib/cosmic'
import { hasWrite } from '@/lib/oauth'
import { productItems } from '@/lib/items'
import { formatMoney } from '@/lib/orders'

export type ShopOutcome =
  | { kind: 'none' }
  | { kind: 'reply'; reply: string; items?: ReturnType<typeof productItems> }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'confirm'; items: CartItem[]; source: 'cart' | 'buy_now' }

type Intent = 'checkout' | 'buy' | 'add' | 'remove' | 'clear' | 'view'

const BAG = String.raw`\b(cart|bag|basket)\b`
const CHECKOUT = /\b(check ?out|place (the |my |an |this )?order|complete (the |my )?(order|purchase)|go ahead and (buy|order|pay)|pay for (it|them|this|that|my)|buy (it|them|now))\b/i
const BUY = /\b(buy|purchase)\b/i
const ADD = /\b(add|put|throw)\b/i
const REMOVE = /\b(remove|delete|take out|drop)\b/i
const CLEAR = new RegExp(String.raw`\b(empty|clear)\b[\s\S]{0,20}` + BAG, 'i')
const VIEW = new RegExp(String.raw`\b(what'?s|what is|show|view|see|check|list)\b[\s\S]{0,25}` + BAG + '|' + String.raw`\bmy ` + BAG, 'i')
const MENTIONS_BAG = new RegExp(BAG, 'i')

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .split(' ')
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
}

function productName(product: Product): string {
  return getMetafieldValue(product.metadata?.product_name) || product.title
}

/** Picks the product whose rarer name words appear in the text. Ties mean the request is ambiguous. */
function matchProduct(text: string, products: Product[]): Product | null {
  // "size 10" names a size, not "Metcon 10".
  const words = new Set(tokens(text.replace(/\bsize\s*\S+/gi, ' ')))
  const names = products.map((product) => new Set(tokens(productName(product))))
  const df = new Map<string, number>()
  names.forEach((name) => name.forEach((token) => df.set(token, (df.get(token) || 0) + 1)))

  const scored = products
    .map((product, index) => {
      let score = 0
      names[index]?.forEach((token) => {
        if (words.has(token)) score += Math.log(1 + products.length / (df.get(token) || 1))
      })
      return { product, score }
    })
    .sort((a, b) => b.score - a.score)

  const [best, second] = scored
  if (!best || best.score < 1.5 || (second && second.score === best.score)) return null
  return best.product
}

function inStock(variant: ProductVariant): boolean {
  return typeof variant.stock !== 'number' || variant.stock > 0
}

function colorMatches(color: string, words: Set<string>): boolean {
  const parts = tokens(color)
  return parts.length > 0 && parts.every((part) => words.has(part))
}

function requestedSize(text: string, sizes: string[], nameTokens: Set<string>): string | undefined {
  const explicit = text.match(/\bsize\s*([0-9]{1,2}(?:\.5)?|xxs|xs|s|m|l|xl|xxl)\b/i)?.[1]
  if (explicit) return sizes.find((size) => size.toLowerCase() === explicit.toLowerCase()) ?? explicit
  return tokens(text).find((token) => sizes.includes(token) && !nameTokens.has(token))
}

function requestedQuantity(text: string): number {
  const match = text.match(/\b([1-9])\s*(x|pairs?|of (them|these|those))\b/i) || text.match(/\bquantity\s*:?\s*([1-9])\b/i)
  return match ? Number(match[1]) : 1
}

type Resolved = { item: Omit<CartItem, 'key' | 'quantity'>; note?: string } | { reply: string }

function resolveVariant(product: Product, text: string): Resolved {
  const name = productName(product)
  const priceId = getMetafieldValue(product.metadata?.stripe_price_id)
  if (!priceId) return { reply: `${name} is not available for online checkout yet. You can see it at /products/${product.slug}.` }

  const base = {
    productId: product.id,
    slug: product.slug,
    name,
    price: Number(product.metadata?.price) || 0,
    priceId,
    image: product.metadata?.gallery?.[0]?.imgix_url,
  }
  const variants = (product.metadata?.variants || []).filter(Boolean)
  if (variants.length === 0) return { item: base }

  const words = new Set(tokens(text))
  const sizes = Array.from(new Set(variants.map((v) => String(v.size || '')).filter(Boolean)))
  const colors = Array.from(new Set(variants.map((v) => String(v.color || '')).filter(Boolean)))
  const size = requestedSize(text, sizes, new Set(tokens(name)))
  const color = colors.find((c) => colorMatches(c, words))

  if (sizes.length > 0 && !size) {
    const available = Array.from(
      new Set(variants.filter((v) => inStock(v) && (!color || v.color === color)).map((v) => String(v.size)))
    )
    return { reply: `Which size? ${name}${color ? ` in ${color}` : ''} is in stock in ${available.join(', ') || 'no sizes right now'}.` }
  }

  const fits = variants.filter((v) => (!size || String(v.size) === size) && (!color || v.color === color))
  const available = fits.filter(inStock)
  const chosen = available[0]
  if (!chosen) {
    const what = [color, size ? `size ${size}` : ''].filter(Boolean).join(', ')
    return { reply: `${name}${what ? ` (${what})` : ''} is out of stock.` }
  }

  const others = available.slice(1).map((v) => v.color).filter(Boolean)
  const note =
    !color && chosen.color && others.length
      ? `I picked ${chosen.color}. It also comes in ${others.join(', ')} in that size.`
      : undefined
  return {
    item: { ...base, color: chosen.color ? String(chosen.color) : undefined, size: chosen.size ? String(chosen.size) : undefined },
    note,
  }
}

function describeItem(item: Pick<CartItem, 'name' | 'color' | 'size'>): string {
  const options = [item.color, item.size ? `size ${item.size}` : ''].filter(Boolean).join(', ')
  return `${item.name}${options ? ` (${options})` : ''}`
}

function describeBag(items: CartItem[]): string {
  if (items.length === 0) return 'Your SWSH. bag is empty.'
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const lines = items.map((item) => `- ${item.quantity}× ${describeItem(item)}, $${(item.price * item.quantity).toFixed(2)}`)
  return `Your SWSH. bag has ${count} item${count === 1 ? '' : 's'}, ${formatMoney(Math.round(subtotal * 100), 'usd')} before checkout:\n${lines.join('\n')}`
}

function detectIntent(text: string, hasProduct: boolean): Intent | null {
  if (CLEAR.test(text)) return 'clear'
  if (CHECKOUT.test(text)) return hasProduct && !MENTIONS_BAG.test(text) ? 'buy' : 'checkout'
  if (REMOVE.test(text) && (MENTIONS_BAG.test(text) || hasProduct)) return 'remove'
  if (ADD.test(text) && (MENTIONS_BAG.test(text) || hasProduct)) return 'add'
  if (BUY.test(text) && hasProduct) return 'buy'
  if (VIEW.test(text)) return 'view'
  return null
}

/** Runs a bag or checkout request, or returns `none` so the message goes to Leo. */
export async function runShopAction(
  caller: CapCaller,
  message: string,
  context?: Record<string, unknown>,
  origin = ''
): Promise<ShopOutcome> {
  const hints = context
    ? Object.values(context).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ')
    : ''
  const text = `${message} ${hints}`.trim()

  const looksLikeShopping = [CLEAR, CHECKOUT, BUY, ADD, REMOVE, VIEW].some((pattern) => pattern.test(message))
  if (!looksLikeShopping) return { kind: 'none' }

  const products = await getProducts()
  const product = matchProduct(message, products) ?? matchProduct(text, products)
  const intent = detectIntent(message, Boolean(product))
  if (!intent) return { kind: 'none' }

  if (!caller.account) {
    return { kind: 'error', code: 'login_required', message: 'This needs your SWSH. account. Log in so I can use your bag.' }
  }
  if (intent !== 'view' && !hasWrite(caller.scope)) {
    return {
      kind: 'error',
      code: 'write_required',
      message: 'This login can read your account but not change your bag. Log in again and allow changes.',
    }
  }

  const account = caller.account
  switch (intent) {
    case 'view': {
      const bag = await getCart(account)
      return { kind: 'reply', reply: describeBag(bag), items: origin ? productItems(bag, origin) : undefined }
    }

    case 'clear':
      await changeCart(account, { op: 'clear' })
      return { kind: 'reply', reply: 'Your SWSH. bag is now empty.' }

    case 'checkout': {
      const items = await getCart(account)
      if (items.length === 0) return { kind: 'reply', reply: 'Your SWSH. bag is empty. Tell me what to add first.' }
      return { kind: 'confirm', items, source: 'cart' }
    }

    case 'buy':
    case 'add': {
      if (!product) {
        const names = products.filter((p) => getMetafieldValue(p.metadata?.stripe_price_id)).map(productName)
        return { kind: 'reply', reply: `Which product do you mean? You can buy ${names.join(', ')}.` }
      }
      const resolved = resolveVariant(product, text)
      if ('reply' in resolved) return { kind: 'reply', reply: resolved.reply }
      const quantity = requestedQuantity(message)

      if (intent === 'buy') {
        const line: CartItem = {
          ...resolved.item,
          key: buildCartKey(resolved.item.productId, resolved.item.color, resolved.item.size),
          quantity,
        }
        return { kind: 'confirm', items: [line], source: 'buy_now' }
      }

      const bag = await changeCart(account, { op: 'add', item: resolved.item, quantity })
      const added = `Added ${quantity > 1 ? `${quantity}× ` : ''}${describeItem(resolved.item)} to your SWSH. bag.`
      return {
        kind: 'reply',
        reply: [added, resolved.note, describeBag(bag), 'Say "check out" when you are ready.'].filter(Boolean).join('\n\n'),
        items: origin ? productItems([resolved.item], origin) : undefined,
      }
    }

    case 'remove': {
      const bag = await getCart(account)
      const words = new Set(tokens(message))
      const size = message.match(/\bsize\s*([0-9]{1,2}(?:\.5)?|xxs|xs|s|m|l|xl|xxl)\b/i)?.[1]?.toLowerCase()
      const color = (product?.metadata?.variants || [])
        .map((v) => String(v.color || ''))
        .find((c) => c && colorMatches(c, words))
      const targets = product
        ? bag.filter(
            (item) =>
              item.productId === product.id &&
              (!color || item.color === color) &&
              (!size || item.size?.toLowerCase() === size)
          )
        : []
      if (targets.length === 0) {
        return { kind: 'reply', reply: product ? `${productName(product)} is not in your bag.` : `Which item should I remove?\n\n${describeBag(bag)}` }
      }
      let next = bag
      for (const item of targets) next = await changeCart(account, { op: 'remove', key: item.key })
      return { kind: 'reply', reply: `Removed ${targets.map(describeItem).join(', ')}.\n\n${describeBag(next)}` }
    }
  }
}
