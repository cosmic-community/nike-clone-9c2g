import { NextResponse } from 'next/server'
import { stripeRequest } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IncomingLine {
  priceId?: unknown
  quantity?: unknown
}

interface StripeCheckoutSession {
  id: string
  url: string | null
}

function getOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: unknown }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Your bag is empty.' }, { status: 400 })
    }

    const lineItems = (body.items as IncomingLine[])
      .map((item) => {
        const priceId = typeof item.priceId === 'string' ? item.priceId.trim() : ''
        const rawQuantity = Number(item.quantity)
        const quantity =
          Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.min(Math.floor(rawQuantity), 99) : 0
        if (!priceId.startsWith('price_') || quantity === 0) return null
        return { price: priceId, quantity }
      })
      .filter((entry): entry is { price: string; quantity: number } => entry !== null)

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'None of the items in your bag are available for checkout.' },
        { status: 400 }
      )
    }

    const origin = getOrigin(request)

    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start checkout.'
    console.error('[checkout] failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
