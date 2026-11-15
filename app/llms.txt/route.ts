import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const origin = siteOrigin(request)
  const body = `# SWSH.

SWSH. is a demo sneaker store. It sells running, training, basketball, skateboarding, and lifestyle shoes, plus socks. Each product page lists the price, colors, sizes, and stock. Shipping is free, and orders ship to the United States, Canada, the United Kingdom, and Australia.

Leo, the store's agent, answers questions about products and sizing in the chat and through CAP. A signed-in shopper's bag is the same on the site and through an agent. Checkout always ends with the shopper paying on the site.

- All products: ${origin}/products
- A product: ${origin}/products/{slug}
- Categories: ${origin}/categories
- Every product with price and stock per size, as JSON: ${origin}/products.json
- Return policy: ${origin}/policies/refund-policy
- Shipping policy: ${origin}/policies/shipping-policy
- Chat with Leo: ${origin}/chat
- Agent card: ${origin}/agent.txt
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
