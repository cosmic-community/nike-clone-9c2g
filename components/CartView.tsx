'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart'

export default function CartView() {
  const { items, subtotal, itemCount, updateQuantity, removeItem, isHydrated } = useCart()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setIsRedirecting(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ priceId: item.priceId, quantity: item.quantity })),
        }),
      })

      const data = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        setError(data.error || 'Could not start checkout. Please try again.')
        setIsRedirecting(false)
        return
      }

      window.location.href = data.url
    } catch {
      setError('Could not reach the checkout service. Please try again.')
      setIsRedirecting(false)
    }
  }

  if (!isHydrated) {
    return <p className="text-gray-500">Loading your bag…</p>
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-600 mb-6">Your bag is empty.</p>
        <Link
          href="/products"
          className="inline-block px-8 py-4 rounded-full bg-black text-white font-bold uppercase tracking-wide hover:bg-accent transition-colors"
        >
          Shop All Products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-12">
      <ul className="lg:col-span-2 divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.key} className="flex gap-4 py-6">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${item.image}?w=200&h=200&fit=crop&auto=format,compress`}
                alt={item.name}
                width={100}
                height={100}
                className="w-24 h-24 object-cover rounded-lg bg-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.slug}`} className="font-bold hover:text-accent">
                {item.name}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {[item.color, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ') ||
                  'One size'}
              </p>

              <div className="flex items-center gap-3 mt-3">
                <label htmlFor={`qty-${item.key}`} className="sr-only">
                  Quantity for {item.name}
                </label>
                <select
                  id={`qty-${item.key}`}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.key, Number(event.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold"
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-sm text-gray-500 underline hover:text-accent"
                >
                  Remove
                </button>
              </div>
            </div>

            <p className="font-bold whitespace-nowrap">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="lg:col-span-1">
        <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
          <h2 className="font-black uppercase tracking-tight text-xl mb-4">Summary</h2>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})
            </span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-600">Shipping</span>
            <span className="font-semibold">Calculated at checkout</span>
          </div>

          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-4 mb-6">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isRedirecting}
            className="w-full py-4 rounded-full bg-accent text-white font-bold uppercase tracking-wide hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRedirecting ? 'Redirecting…' : 'Checkout'}
          </button>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <p className="text-xs text-gray-500 mt-4 text-center">
            Secure payment powered by Stripe.
          </p>
        </div>
      </aside>
    </div>
  )
}
