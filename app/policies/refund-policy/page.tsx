import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Return policy | SWSH.',
  description: 'How returns and refunds work at SWSH.',
}

export default function RefundPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-gray-700 leading-relaxed">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">Return policy</h1>
      <p className="text-sm text-gray-500">SWSH. is a demonstration store. This is the policy the demo runs on.</p>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">30 days to return</h2>
        <p>
          You can return shoes within 30 days of delivery for a full refund. Shoes need to be unworn, in the original box. Socks are returnable only in their unopened pack.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">How to start a return</h2>
        <p>
          Sign in and open the <Link href="/chat" className="underline">chat</Link>. Leo can see your orders, so name the order and the items you are sending back.
          Return shipping is free: a prepaid label comes with the return approval.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Refunds</h2>
        <p>
          Refunds go back to the card used at checkout, through Stripe. They are issued within 3 business days of the return reaching the warehouse. Your bank
          may take another 5 to 10 business days to show it. Shipping was free, so there is no shipping charge to refund or deduct.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Exchanges</h2>
        <p>
          For a different size or color, return the item and place a new order. This keeps the size you want from selling out while the return is in transit.
          See the <Link href="/policies/shipping-policy" className="underline">shipping policy</Link> for delivery times.
        </p>
      </section>
    </article>
  )
}
