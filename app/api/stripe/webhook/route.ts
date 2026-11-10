import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/auth'
import { failExpiredSession, settlePaidSession } from '@/lib/confirmations'
import type { StripeSession } from '@/lib/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOLERANCE_SECONDS = 300

/** Checks the Stripe-Signature header (https://docs.stripe.com/webhooks#verify-manually). */
function verified(payload: string, header: string, secret: string): boolean {
  const parts = header.split(',').map((part) => part.split('='))
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1])
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value || '')
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return signatures.some((signature) => safeEqual(signature, expected))
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set.' }, { status: 500 })

  const payload = await request.text()
  if (!verified(payload, request.headers.get('stripe-signature') || '', secret)) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 })
  }

  const event = JSON.parse(payload) as { type: string; data: { object: StripeSession } }
  const session = event.data.object

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await settlePaidSession(session)
        break
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await failExpiredSession(session)
        break
    }
  } catch (error) {
    console.error('[stripe] webhook handling failed', event.type, error)
    return NextResponse.json({ error: 'Handling failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
