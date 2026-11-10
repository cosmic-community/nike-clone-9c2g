import { sha256 } from '@/lib/auth'
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

export interface StripeSession {
  id: string
  status?: string | null
  payment_status: string
  client_reference_id: string | null
  amount_total: number | null
  currency: string | null
  customer_email?: string | null
  customer_details?: { email?: string | null } | null
  metadata?: Record<string, string> | null
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

/** A short order number the shopper can quote. Derived, so no internal id leaves the store. */
export function orderReference(orderId: string): string {
  return `SW-${sha256(orderId).slice(0, 8).toUpperCase()}`
}

export function isStripeSessionId(value: string): boolean {
  return /^cs_[A-Za-z0-9_]+$/.test(value)
}

export function getStripeSession(sessionId: string): Promise<StripeSession> {
  return stripeGet<StripeSession>(`/checkout/sessions/${sessionId}?expand[]=line_items`)
}

/**
 * Records a paid Checkout session as an order for the customer in `client_reference_id`.
 * Safe to call more than once for the same session.
 */
export async function recordPaidSession(session: StripeSession): Promise<StoredObject | null> {
  if (session.payment_status !== 'paid' || !session.client_reference_id) return null

  const existing = await findFirst('orders', { 'metadata.stripe_session_id': session.id })
  if (existing) return existing

  const full = session.line_items ? session : await getStripeSession(session.id)
  const items: OrderItem[] = (full.line_items?.data ?? []).map((line) => ({
    description: line.description || 'Item',
    quantity: line.quantity || 1,
    amount_total: line.amount_total,
  }))
  const email = full.customer_details?.email || full.customer_email || full.client_reference_id

  return insertObject('orders', `Order · ${email} · ${new Date().toISOString().slice(0, 10)}`, {
    customer_id: full.client_reference_id,
    stripe_session_id: full.id,
    status: 'paid',
    amount_total: full.amount_total ?? 0,
    currency: full.currency || 'usd',
    items,
  })
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
  if (!isStripeSessionId(sessionId)) return 'skipped'

  const existing = await findFirst('orders', { 'metadata.stripe_session_id': sessionId })
  if (existing) return 'exists'

  const session = await getStripeSession(sessionId)
  if (session.client_reference_id !== customer.id) return 'skipped'
  return (await recordPaidSession(session)) ? 'recorded' : 'skipped'
}
