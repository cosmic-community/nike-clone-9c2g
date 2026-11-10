import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'
import { getCurrentCustomer } from '@/lib/auth'
import {
  confirmationLines,
  confirmationTotal,
  effectiveStatus,
  findConfirmation,
  settlePaidSession,
} from '@/lib/confirmations'
import { formatMoney, getStripeSession, isStripeSessionId } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Approve your order | SWSH.',
  robots: { index: false },
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-6">{title}</h1>
      {children}
    </div>
  )
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string; error?: string }>
}) {
  const { id } = await params
  const { session_id, error } = await searchParams
  const customer = await getCurrentCustomer()

  if (!customer) {
    return (
      <Shell title="Log in to continue">
        <p className="text-gray-600 mb-6">An AI agent is holding an order for you. Log in to review it.</p>
        <AuthForm next={`/confirm/${id}`} />
      </Shell>
    )
  }

  let confirmation = await findConfirmation(id)
  if (!confirmation) {
    return (
      <Shell title="Not found">
        <p className="text-gray-600">This request does not exist. Ask your agent to start again.</p>
      </Shell>
    )
  }
  if (confirmation.metadata.account !== customer.id) {
    return (
      <Shell title="Different account">
        <p className="text-gray-600">This order is for another SWSH. account. Log out and log in with that account.</p>
      </Shell>
    )
  }

  // Back from Stripe. The webhook does the same, whichever arrives first. Stripe is the source of
  // truth here: our own read of the confirmation can lag a write by a moment.
  let paid = false
  if (session_id && isStripeSessionId(session_id) && confirmation.metadata.status !== 'done') {
    try {
      const session = await getStripeSession(session_id)
      if (session.metadata?.confirmation_id === id && session.client_reference_id === customer.id) {
        paid = session.payment_status === 'paid'
        confirmation = (await settlePaidSession(session)) ?? confirmation
      }
    } catch (settleError) {
      console.error('[confirm] could not settle payment', settleError)
    }
  }

  const stored = effectiveStatus(confirmation)
  const status = paid && stored !== 'done' ? 'done' : stored
  const lines = confirmationLines(confirmation)
  const { cents, currency } = confirmationTotal(confirmation)
  const agentName = String(confirmation.metadata.client_name || '') || 'Your AI agent'
  const result = (confirmation.metadata.result || {}) as { message?: string }
  const button = 'flex-1 py-4 rounded-full font-bold uppercase tracking-wide'

  const summary = (
    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
      <ul className="divide-y divide-gray-200 mb-4">
        {lines.map((line) => (
          <li key={line.key} className="py-3 flex justify-between gap-4">
            <div>
              <Link href={`/products/${line.slug}`} className="font-bold hover:text-accent">
                {line.name}
              </Link>
              <p className="text-sm text-gray-500">
                {[line.color, line.size ? `Size ${line.size}` : '', `Qty ${line.quantity}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="font-semibold whitespace-nowrap">
              {formatMoney(line.unit_amount * line.quantity, line.currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Shipping</span>
        <span>Free</span>
      </div>
      <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3">
        <span>Total</span>
        <span>{formatMoney(cents, currency)}</span>
      </div>
    </div>
  )

  if (status === 'done') {
    return (
      <Shell title="Order placed">
        <p className="text-gray-600 mb-6">{result.message || 'Your order is placed.'}</p>
        {summary}
        <p className="text-sm text-gray-500 mb-6">{agentName} has been told. You can close this page.</p>
        <Link href="/account" className="underline font-semibold">
          View your orders
        </Link>
      </Shell>
    )
  }

  if (status === 'denied' || status === 'expired' || status === 'failed') {
    const message =
      status === 'denied'
        ? 'You turned this order down. Nothing was charged.'
        : status === 'expired'
          ? 'This request expired. Nothing was charged. Ask your agent to start again.'
          : result.message || 'The payment did not go through. Nothing was charged.'
    return (
      <Shell title={status === 'denied' ? 'Order declined' : status === 'expired' ? 'Request expired' : 'Payment not finished'}>
        <p className="text-gray-600">{message}</p>
      </Shell>
    )
  }

  return (
    <Shell title={status === 'working' ? 'Finish paying' : 'Approve your order'}>
      <p className="text-gray-600 mb-6">
        <span className="font-bold text-black">{agentName}</span> put together this order for you. Nothing is charged
        until you pay.
      </p>
      {summary}
      {error && <p className="text-sm text-red-600 mb-4">Could not open the payment page. Try again.</p>}
      <form method="POST" action={`/api/confirm/${id}`} className="flex flex-col sm:flex-row gap-3">
        <button name="decision" value="pay" className={`${button} bg-accent text-white hover:bg-black`}>
          {status === 'working' ? 'Continue to payment' : `Pay ${formatMoney(cents, currency)}`}
        </button>
        <button name="decision" value="deny" className={`${button} border border-gray-300`}>
          {status === 'working' ? 'Cancel order' : 'Decline'}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-4 text-center">
        Signed in as {customer.email}. Secure payment powered by Stripe. Your card details are never shared with the
        agent.
      </p>
    </Shell>
  )
}
