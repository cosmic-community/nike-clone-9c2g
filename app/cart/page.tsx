import type { Metadata } from 'next'
import CartView from '@/components/CartView'

export const metadata: Metadata = {
  title: 'Your Bag | SWSH.',
  description: 'Review the items in your bag and check out securely.',
}

export default function CartPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Your Bag</h1>
      <CartView />
    </div>
  )
}
