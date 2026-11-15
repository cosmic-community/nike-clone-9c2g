import { getProducts, getMetafieldValue } from '@/lib/cosmic'
import { productAvailable, variantAvailable } from '@/lib/catalog'
import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const origin = siteOrigin(request)
  const products = (await getProducts()).map((product) => {
    const price = (Number(product.metadata?.price) || 0).toFixed(2)
    const compareAt = Number(product.metadata?.compare_at_price) || 0
    const variants = product.metadata?.variants || []
    const category = product.metadata?.category
    return {
      title: getMetafieldValue(product.metadata?.product_name) || product.title,
      handle: product.slug,
      url: `${origin}/products/${product.slug}`,
      vendor: 'SWSH',
      product_type: category ? getMetafieldValue(category.metadata?.name) || category.title : '',
      body: getMetafieldValue(product.metadata?.description) || '',
      images: (product.metadata?.gallery || []).map((image) => ({ src: image.imgix_url })),
      variants: variants.length
        ? variants.map((variant) => ({
            title: [variant.color, variant.size].filter(Boolean).join(' / ') || 'Default',
            sku: variant.sku || null,
            option1: variant.color || null,
            option2: variant.size || null,
            price,
            compare_at_price: compareAt ? compareAt.toFixed(2) : null,
            currency: 'USD',
            available: variantAvailable(product, variant),
          }))
        : [{ title: 'Default', price, compare_at_price: compareAt ? compareAt.toFixed(2) : null, currency: 'USD', available: productAvailable(product) }],
    }
  })
  return Response.json({ products }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
