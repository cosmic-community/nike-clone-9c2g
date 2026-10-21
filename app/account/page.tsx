import type { Metadata } from 'next'
import AuthForm from '@/components/AuthForm'
import { getCurrentCustomer, safeNext } from '@/lib/auth'
import { formatMoney, getOrdersForCustomer } from '@/lib/orders'
import { findMany } from '@/lib/store'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Account | SWSH.',
  robots: { index: false },
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const customer = await getCurrentCustomer()

  if (!customer) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Your Account</h1>
        <p className="text-gray-600 mb-8">Sign in or create an account to place and track orders.</p>
        <AuthForm next={safeNext(next)} />
      </div>
    )
  }

  const [orders, agents] = await Promise.all([
    getOrdersForCustomer(customer.id),
    findMany('cap-logins', { 'metadata.account': customer.id, 'metadata.status': 'active' }, 20),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Hi{customer.name ? `, ${customer.name}` : ''}</h1>
          <p className="text-gray-500 mt-1">{customer.email}</p>
        </div>
        <form method="POST" action="/api/auth/logout">
          <button className="text-sm underline text-gray-600 hover:text-accent">Sign out</button>
        </form>
      </div>

      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-600 mb-12">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 mb-12">
          {orders.map((order) => (
            <li key={order.id} className="py-4">
              <div className="flex justify-between font-semibold">
                <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Order'}</span>
                <span>{formatMoney(order.amount_total, order.currency)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="uppercase text-xs font-bold text-green-700 mr-2">{order.status}</span>
                {order.items.map((item) => `${item.quantity}× ${item.description}`).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-black uppercase tracking-tight mb-2">Connected AI agents</h2>
      <p className="text-sm text-gray-500 mb-4">Agents you allowed to read your account. Disconnecting stops them right away.</p>
      {agents.length === 0 ? (
        <p className="text-gray-600">None.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {agents.map((agent) => (
            <li key={agent.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{String(agent.metadata.client_name || 'AI agent')}</p>
                <p className="text-xs text-gray-500 font-mono">{String(agent.metadata.cap_from)}</p>
              </div>
              <form method="POST" action="/api/account/agents/revoke">
                <input type="hidden" name="login_id" value={agent.id} />
                <button className="text-sm underline text-red-600">Disconnect</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
