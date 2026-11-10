// Purchases an agent asks for wait here until the shopper approves and pays on /confirm/{id}.
// https://conciergeprotocol.org/spec#confirm-an-action
import { randomBytes } from 'crypto'
import type { CartItem } from '@/types'
import type { CapCaller, CapMessageData } from '@/lib/cap'
import { changeCart } from '@/lib/carts'
import { formatMoney, orderReference, recordPaidSession, type StripeSession } from '@/lib/orders'
import { findFirst, insertObject, updateMetadata, type StoredObject } from '@/lib/store'
import { stripeGet } from '@/lib/stripe'

export const CONFIRM_TTL_MS = 10 * 60 * 1000
const MERCHANT = 'SWSH.'

export type ConfirmationStatus = 'pending' | 'working' | 'done' | 'failed' | 'denied' | 'expired'

export interface PurchaseLine {
  key: string
  product_id: string
  slug: string
  name: string
  color?: string
  size?: string
  quantity: number
  price_id: string
  unit_amount: number
  currency: string
}

export class ShopError extends Error {}

interface StripePrice {
  id: string
  active: boolean
  unit_amount: number | null
  currency: string
}

function decimal(cents: number): string {
  return (cents / 100).toFixed(2)
}

function describeLine(line: Pick<PurchaseLine, 'name' | 'color' | 'size' | 'quantity'>): string {
  const options = [line.color, line.size ? `size ${line.size}` : ''].filter(Boolean).join(', ')
  return `${line.quantity > 1 ? `${line.quantity}× ` : ''}${line.name}${options ? ` (${options})` : ''}`
}

/** Prices come from Stripe, the same Price objects checkout charges, never from the cart or the agent. */
async function priceLines(items: CartItem[]): Promise<PurchaseLine[]> {
  const lines: PurchaseLine[] = []
  for (const item of items) {
    const price = await stripeGet<StripePrice>(`/prices/${encodeURIComponent(item.priceId)}`)
    if (!price.active || typeof price.unit_amount !== 'number') {
      throw new ShopError(`${item.name} is not available for checkout right now.`)
    }
    lines.push({
      key: item.key,
      product_id: item.productId,
      slug: item.slug,
      name: item.name,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price_id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
    })
  }
  if (new Set(lines.map((line) => line.currency)).size > 1) {
    throw new ShopError('These items cannot be bought together in one order.')
  }
  return lines
}

export function confirmUrl(origin: string, id: string): string {
  return `${origin}/confirm/${id}`
}

export function effectiveStatus(object: StoredObject): ConfirmationStatus {
  const status = String(object.metadata.status) as ConfirmationStatus
  if (status === 'pending' && Date.parse(String(object.metadata.expires_at)) <= Date.now()) return 'expired'
  return status
}

export function confirmationLines(object: StoredObject): PurchaseLine[] {
  return Array.isArray(object.metadata.lines) ? (object.metadata.lines as PurchaseLine[]) : []
}

export function confirmationTotal(object: StoredObject): { cents: number; currency: string } {
  const lines = confirmationLines(object)
  return {
    cents: lines.reduce((sum, line) => sum + line.unit_amount * line.quantity, 0),
    currency: lines[0]?.currency || 'usd',
  }
}

/** The confirmation as a CAP caller sees it. */
export function publicConfirmation(object: StoredObject, origin: string) {
  const status = effectiveStatus(object)
  const id = String(object.metadata.confirmation_id)
  const result = object.metadata.result as Record<string, unknown> | null
  return {
    id,
    status,
    ...(status === 'pending' ? { url: confirmUrl(origin, id) } : {}),
    summary: String(object.metadata.summary),
    authorization_details: object.metadata.authorization_details,
    expires_at: String(object.metadata.expires_at),
    ...((status === 'done' || status === 'failed') && result && Object.keys(result).length ? { result } : {}),
  }
}

export async function findConfirmation(id: string): Promise<StoredObject | null> {
  if (!/^cfm_[a-f0-9]{24}$/.test(id)) return null
  return findFirst('cap-confirmations', { 'metadata.confirmation_id': id })
}

/** The current state of the confirmation a stored message is holding, if any. */
export async function messageConfirmation(data: CapMessageData, origin: string) {
  if (data.status !== 'done' || !data.confirmation_id) return null
  const confirmation = await findConfirmation(data.confirmation_id)
  return confirmation ? publicConfirmation(confirmation, origin) : null
}

/** Holds a purchase for the shopper's OK. Nothing is charged here. */
export async function holdPurchase(
  caller: CapCaller,
  items: CartItem[],
  source: 'cart' | 'buy_now'
): Promise<StoredObject> {
  if (!caller.account) throw new ShopError('Log in to buy.')
  if (items.length === 0) throw new ShopError('Your bag is empty.')

  const lines = await priceLines(items)
  const cents = lines.reduce((sum, line) => sum + line.unit_amount * line.quantity, 0)
  const currency = lines[0]?.currency || 'usd'
  const total = formatMoney(cents, currency)
  const described = lines.map(describeLine)
  const summary =
    lines.length === 1
      ? `Buy ${described[0]} from ${MERCHANT} for ${total}.`
      : `Buy ${lines.length} items from ${MERCHANT} for ${total}: ${described.join('; ')}.`

  const id = `cfm_${randomBytes(12).toString('hex')}`
  return insertObject('cap-confirmations', `${caller.capFrom} · ${id}`, {
    confirmation_id: id,
    cap_from: caller.capFrom,
    client_name: caller.clientName,
    account: caller.account,
    status: 'pending',
    summary,
    authorization_details: [
      {
        type: 'purchase',
        merchant: MERCHANT,
        items: lines.map((line) => ({
          name: line.name,
          ...(line.color || line.size
            ? { options: { ...(line.color ? { color: line.color } : {}), ...(line.size ? { size: line.size } : {}) } }
            : {}),
          quantity: line.quantity,
          unit_price: decimal(line.unit_amount),
        })),
        subtotal: decimal(cents),
        shipping: '0.00',
        tax: '0.00',
        total: decimal(cents),
        currency: currency.toUpperCase(),
      },
    ],
    lines,
    source,
    expires_at: new Date(Date.now() + CONFIRM_TTL_MS).toISOString(),
    stripe_session_id: '',
    stripe_session_url: '',
    result: {},
  })
}

/**
 * Marks the confirmation for a paid session done, records the order, and takes the items out of the bag.
 * Returns the confirmation as it now stands. Reads right after a write can be served from cache, so
 * callers should use this rather than reading the confirmation again.
 */
export async function settlePaidSession(session: StripeSession): Promise<StoredObject | null> {
  const confirmationId = session.metadata?.confirmation_id
  const order = await recordPaidSession(session)
  if (!order || !confirmationId) return null

  const confirmation = await findConfirmation(confirmationId)
  if (!confirmation || confirmation.metadata.account !== session.client_reference_id) return null

  const reference = orderReference(order.id)
  const { cents, currency } = confirmationTotal(confirmation)
  const settled = {
    status: 'done',
    result: {
      message: `Order ${reference} is placed. ${formatMoney(session.amount_total ?? cents, session.currency || currency)} was charged, and a receipt is on its way by email.`,
      reference,
    },
  }
  const current = { ...confirmation, metadata: { ...confirmation.metadata, ...settled } }
  if (confirmation.metadata.status === 'done') return current

  await updateMetadata(confirmation, settled)

  if (confirmation.metadata.source === 'cart') {
    const lines = confirmationLines(confirmation).map((line) => ({ key: line.key, quantity: line.quantity }))
    await changeCart(String(confirmation.metadata.account), { op: 'subtract', lines }).catch((error) =>
      console.error('[confirm] could not update bag after payment', error)
    )
  }
  return current
}

/** A checkout the shopper never finished. Nothing was charged. */
export async function failExpiredSession(session: StripeSession): Promise<void> {
  const confirmationId = session.metadata?.confirmation_id
  if (!confirmationId) return
  const confirmation = await findConfirmation(confirmationId)
  if (!confirmation || confirmation.metadata.status !== 'working') return
  if (confirmation.metadata.stripe_session_id !== session.id) return
  await updateMetadata(confirmation, {
    status: 'failed',
    result: { message: 'Payment was not finished, so nothing was charged.' },
  })
}
