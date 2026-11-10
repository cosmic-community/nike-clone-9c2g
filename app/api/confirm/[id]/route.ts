import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/auth'
import { confirmationLines, effectiveStatus, findConfirmation } from '@/lib/confirmations'
import { siteOrigin } from '@/lib/oauth'
import { updateMetadata } from '@/lib/store'
import { stripeRequest } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe requires a checkout session to stay open at least 30 minutes.
const CHECKOUT_TTL_SECONDS = 31 * 60

interface StripeCheckoutSession {
  id: string
  url: string | null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const origin = siteOrigin(request)
  const back = (query = '') => NextResponse.redirect(`${origin}/confirm/${id}${query}`, 303)

  const customer = await getCurrentCustomer()
  if (!customer) return back()

  const confirmation = await findConfirmation(id)
  if (!confirmation || confirmation.metadata.account !== customer.id) return back()

  const form = await request.formData()
  const decision = String(form.get('decision') || '')
  const status = effectiveStatus(confirmation)
  const sessionId = String(confirmation.metadata.stripe_session_id || '')

  try {
    if (decision === 'deny') {
      if (status === 'working' && sessionId) {
        // Close the payment page so the held order cannot be paid later.
        await stripeRequest(`/checkout/sessions/${sessionId}/expire`, {}).catch(() => undefined)
      }
      if (status === 'pending' || status === 'working') await updateMetadata(confirmation, { status: 'denied' })
      return back()
    }

    if (decision !== 'pay') return back()

    if (status === 'working' && confirmation.metadata.stripe_session_url) {
      return NextResponse.redirect(String(confirmation.metadata.stripe_session_url), 303)
    }
    if (status !== 'pending') return back()

    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      mode: 'payment',
      line_items: confirmationLines(confirmation).map((line) => ({ price: line.price_id, quantity: line.quantity })),
      success_url: `${origin}/confirm/${id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/confirm/${id}`,
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      client_reference_id: customer.id,
      customer_email: customer.email,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
      metadata: { customer_id: customer.id, confirmation_id: id },
    })
    if (!session.url) return back('?error=checkout')

    await updateMetadata(confirmation, {
      status: 'working',
      stripe_session_id: session.id,
      stripe_session_url: session.url,
    })
    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error('[confirm] decision failed', error)
    return back('?error=checkout')
  }
}
