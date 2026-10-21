import { findFirst, findMany, insertObject, type StoredObject } from '@/lib/store'
import { stripeGet } from '@/lib/stripe'

export interface OrderItem {
  description: string
  quantity: number
  amount_total: number
}

export interface OrderSummary {
  id: string
  created_at: string
  status: string
  amount_total: number
  currency: string
  items: OrderItem[]
}

interface StripeSession {
  id: string
  payment_status: string
  client_reference_id: string | null
  amount_total: number | null
  currency: string | null
  line_items?: {
    data: Array<{ description: string | null; quantity: number | null; amount_total: number }>
  }
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format((cents || 0) / 100)
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)}`
  }
}

function toSummary(object: StoredObject): OrderSummary {
  const items = Array.isArray(object.metadata?.items) ? (object.metadata.items as OrderItem[]) : []
  return {
    id: object.id,
    created_at: object.created_at || '',
    status: String(object.metadata?.status || 'paid'),
    amount_total: Number(object.metadata?.amount_total || 0),
    currency: String(object.metadata?.currency || 'usd'),
    items,
  }
}

export async function getOrdersForCustomer(customerId: string): Promise<OrderSummary[]> {
  const rows = await findMany('orders', { 'metadata.customer_id': customerId }, 50)
  return rows.map(toSummary)
}

/**
 * Records a paid Stripe Checkout session as an order for the signed-in customer.
 * Verifies the session with Stripe and checks it belongs to this customer, so a
 * session id in the URL alone cannot create or claim an order.
 */
export async function recordOrderFromSession(
  sessionId: string,
  customer: { id: string; email: string }
): Promise<'recorded' | 'exists' | 'skipped'> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return 'skipped'

  const existing = await findFirst('orders', { 'metadata.stripe_session_id': sessionId })
  if (existing) return 'exists'

  const session = await stripeGet<StripeSession>(`/checkout/sessions/${sessionId}?expand[]=line_items`)
  if (session.payment_status !== 'paid' || session.client_reference_id !== customer.id) return 'skipped'

  const items: OrderItem[] = (session.line_items?.data ?? []).map((line) => ({
    description: line.description || 'Item',
    quantity: line.quantity || 1,
    amount_total: line.amount_total,
  }))

  await insertObject('orders', `Order · ${customer.email} · ${new Date().toISOString().slice(0, 10)}`, {
    customer_id: customer.id,
    stripe_session_id: session.id,
    status: 'paid',
    amount_total: session.amount_total ?? 0,
    currency: session.currency || 'usd',
    items,
  })

  return 'recorded'
}
