// Server-side bag for signed-in shoppers, so the shopper's browser and their
// connected AI agent see and change the same bag.
import type { CartItem } from '@/types'
import { findFirst, insertObject, updateMetadata } from '@/lib/store'

const MAX_LINES = 50
const MAX_QUANTITY = 99

export type CartOp =
  | { op: 'add'; item: Omit<CartItem, 'key' | 'quantity'>; quantity?: number }
  | { op: 'update'; key: string; quantity: number }
  | { op: 'remove'; key: string }
  | { op: 'clear' }
  | { op: 'merge'; items: CartItem[] }
  | { op: 'subtract'; lines: Array<{ key: string; quantity: number }> }

export function buildCartKey(productId: string, color?: string, size?: string): string {
  return [productId, color || '', size || ''].join('::')
}

function clampQuantity(value: unknown): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) ? Math.max(0, Math.min(n, MAX_QUANTITY)) : 0
}

function optionalString(value: unknown, max = 200): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

/** Accepts only well-formed lines. Prices are re-read from Stripe at checkout, never trusted from here. */
export function sanitizeItem(raw: unknown): CartItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  const productId = optionalString(value.productId, 64)
  const priceId = optionalString(value.priceId, 128)
  const quantity = clampQuantity(value.quantity ?? 1)
  if (!productId || !priceId?.startsWith('price_') || quantity === 0) return null
  const color = optionalString(value.color, 80)
  const size = optionalString(value.size, 20)
  return {
    key: buildCartKey(productId, color, size),
    productId,
    slug: optionalString(value.slug, 200) || '',
    name: optionalString(value.name, 200) || 'Item',
    price: Number.isFinite(Number(value.price)) ? Number(value.price) : 0,
    priceId,
    image: optionalString(value.image, 500),
    color,
    size,
    quantity,
  }
}

export async function getCart(customerId: string): Promise<CartItem[]> {
  const cart = await findFirst('carts', { 'metadata.customer_id': customerId })
  const items = Array.isArray(cart?.metadata?.items) ? cart.metadata.items : []
  return items.map(sanitizeItem).filter((item): item is CartItem => item !== null)
}

function addLine(items: CartItem[], line: CartItem): CartItem[] {
  const existing = items.find((entry) => entry.key === line.key)
  if (existing) {
    return items.map((entry) =>
      entry.key === line.key ? { ...entry, quantity: clampQuantity(entry.quantity + line.quantity) } : entry
    )
  }
  return items.length >= MAX_LINES ? items : [...items, line]
}

function applyOp(items: CartItem[], op: CartOp): CartItem[] {
  switch (op.op) {
    case 'add': {
      const line = sanitizeItem({ ...op.item, quantity: op.quantity ?? 1 })
      return line ? addLine(items, line) : items
    }
    case 'update': {
      const quantity = clampQuantity(op.quantity)
      if (quantity === 0) return items.filter((entry) => entry.key !== op.key)
      return items.map((entry) => (entry.key === op.key ? { ...entry, quantity } : entry))
    }
    case 'remove':
      return items.filter((entry) => entry.key !== op.key)
    case 'clear':
      return []
    case 'merge':
      return op.items
        .map(sanitizeItem)
        .filter((line): line is CartItem => line !== null)
        .reduce(addLine, items)
    case 'subtract':
      return items
        .map((entry) => {
          const taken = op.lines.find((line) => line.key === entry.key)
          return taken ? { ...entry, quantity: entry.quantity - taken.quantity } : entry
        })
        .filter((entry) => entry.quantity > 0)
  }
}

/** Applies one change to the shopper's stored bag and returns the new bag. */
export async function changeCart(customerId: string, op: CartOp): Promise<CartItem[]> {
  const cart = await findFirst('carts', { 'metadata.customer_id': customerId })
  const current = Array.isArray(cart?.metadata?.items)
    ? (cart.metadata.items as unknown[]).map(sanitizeItem).filter((item): item is CartItem => item !== null)
    : []
  const next = applyOp(current, op)

  if (cart) {
    await updateMetadata(cart, { items: next })
  } else if (next.length > 0) {
    await insertObject('carts', `Cart · ${customerId}`, { customer_id: customerId, items: next })
  }
  return next
}
