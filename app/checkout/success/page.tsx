import type { Metadata } from 'next'
import Link from 'next/link'
import ClearCartOnMount from '@/components/ClearCartOnMount'

export const metadata: Metadata = {
  title: 'Order Confirmed | SWSH.',
  description: 'Thanks for your order.',
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <ClearCartOnMount />

      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-8 h-8 text-green-600"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Order Confirmed</h1>
      <p className="text-gray-600 mb-2">
        Thanks for your order. A confirmation email is on its way.
      </p>
      {session_id && (
        <p className="text-xs text-gray-400 mb-8 break-all">Reference: {session_id}</p>
      )}

      <Link
        href="/products"
        className="inline-block px-8 py-4 rounded-full bg-black text-white font-bold uppercase tracking-wide hover:bg-accent transition-colors"
      >
        Keep Shopping
      </Link>
    </div>
  )
}
