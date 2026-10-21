// Answers CAP messages directly from this store's own data.
// No external AI/agent API is called, so no extra credentials are needed.
import { getCustomerById } from '@/lib/auth'
import { getProducts } from '@/lib/cosmic'
import { formatMoney, getOrdersForCustomer } from '@/lib/orders'

const ORDER_HINT = /\b(orders?|purchases?|bought|shipments?|shipping|deliver(y|ies)|status|track(ing)?)\b/i
const ACCOUNT_HINT = /\b(account|profile|email|who am i)\b/i
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'have', 'any', 'what', 'which', 'with', 'show', 'find', 'are', 'can',
  'do', 'does', 'need', 'want', 'looking', 'some', 'shoes', 'shoe', 'please', 'about', 'from', 'that', 'this',
])

function formatPrice(price: unknown): string {
  const value = typeof price === 'number' ? price : Number(price)
  if (!Number.isFinite(value)) return 'price on request'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

async function describeOrders(account: string): Promise<string> {
  const orders = await getOrdersForCustomer(account)
  if (!orders.length) return 'You have no orders with us yet.'
  const lines = orders.slice(0, 10).map((order) => {
    const items = order.items.map((item) => `${item.quantity}x ${item.description}`).join(', ') || 'items'
    return `- ${order.created_at.slice(0, 10)}: ${items} (${formatMoney(order.amount_total, order.currency)}, ${order.status})`
  })
  const more = orders.length > 10 ? `\n...and ${orders.length - 10} older orders.` : ''
  return `You have ${orders.length} order${orders.length === 1 ? '' : 's'}, newest first:\n${lines.join('\n')}${more}`
}

async function describeAccount(account: string): Promise<string> {
  const customer = await getCustomerById(account)
  if (!customer) return 'I could not find your account details.'
  const orders = await getOrdersForCustomer(account)
  return `You are logged in as ${customer.name || customer.email} (${customer.email}) with ${orders.length} order${
    orders.length === 1 ? '' : 's'
  }.`
}

async function describeCatalog(text: string, origin: string): Promise<string> {
  let products: Awaited<ReturnType<typeof getProducts>> = []
  try {
    products = await getProducts()
  } catch (error) {
    console.error('[cap] could not load products', error)
  }
  if (!products.length) return `I can't load the catalog right now. You can browse it at ${origin}/products.`

  const terms = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

  const scored = products
    .map((product) => {
      const haystack = [
        product.title,
        product.metadata?.product_name,
        product.metadata?.description,
        product.metadata?.category?.title,
        product.metadata?.category?.metadata?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
      return { product, score }
    })
    .filter((row) => terms.length === 0 || row.score > 0)
    .sort((a, b) => b.score - a.score)

  const picks = (scored.length ? scored.map((row) => row.product) : products).slice(0, 5)
  const intro = scored.length && terms.length ? 'Here is what matches:' : 'Here are a few of our products:'
  const lines = picks.map((product) => {
    const name = product.metadata?.product_name || product.title
    const stock = product.metadata?.inventory_status ? `, ${product.metadata.inventory_status}` : ''
    return `- ${name}: ${formatPrice(product.metadata?.price)}${stock}. ${origin}/products/${product.slug}`
  })
  return `${intro}\n${lines.join('\n')}\n\nOrders are placed on our website. I can't buy or change anything for you.`
}

export async function answerCap(text: string, account: string | null, origin: string): Promise<string> {
  if (account && ORDER_HINT.test(text)) return describeOrders(account)
  if (account && ACCOUNT_HINT.test(text)) return describeAccount(account)
  return describeCatalog(text, origin)
}
