import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Shipping policy | SWSH.',
  description: 'Where SWSH. ships, what it costs, and how long it takes.',
}

export default function ShippingPolicyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-gray-700 leading-relaxed">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">Shipping policy</h1>
      <p className="text-sm text-gray-500">SWSH. is a demonstration store. This is the policy the demo runs on.</p>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Free shipping on every order</h2>
        <p>
          Shipping is free, with no minimum. The total at checkout is the price of the items. Nothing is added for shipping.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Where we ship</h2>
        <p>
          Orders ship to the United States, Canada, the United Kingdom, and Australia. You enter the shipping address on the Stripe checkout page, which only
          accepts addresses in those countries.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Delivery times</h2>
        <p>
          Orders leave the warehouse within 1 to 2 business days. Delivery in the United States takes 3 to 5 business days after that. Canada, the United
          Kingdom, and Australia take 7 to 12 business days. Duties and import taxes outside the United States are paid by the recipient on delivery.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold uppercase text-sm tracking-wide text-black">Order status</h2>
        <p>
          Sign in and ask Leo in the <Link href="/chat" className="underline">chat</Link> for your orders. Leo lists each order with its date, status, and total.
          To send something back, see the <Link href="/policies/refund-policy" className="underline">return policy</Link>.
        </p>
      </section>
    </article>
  )
}
