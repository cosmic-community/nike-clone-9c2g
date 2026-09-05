// app/products/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProduct, getReviewsForProduct, getMetafieldValue } from '@/lib/cosmic'
import ProductGallery from '@/components/ProductGallery'
import PriceDisplay from '@/components/PriceDisplay'
import InventoryBadge from '@/components/InventoryBadge'
import VariantSelector from '@/components/VariantSelector'
import ReviewsList from '@/components/ReviewsList'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const reviews = await getReviewsForProduct(product.id)

  const name = getMetafieldValue(product.metadata?.product_name) || product.title
  const description = getMetafieldValue(product.metadata?.description)
  const category = product.metadata?.category
  const inventoryStatus = getMetafieldValue(product.metadata?.inventory_status)

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.metadata?.rating) || 0), 0) / reviews.length
      : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/products" className="hover:text-black transition-colors">
          Products
        </Link>
        {category && (
          <>
            {' / '}
            <Link href={`/categories/${category.slug}`} className="hover:text-black transition-colors">
              {getMetafieldValue(category.metadata?.name) || category.title}
            </Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ProductGallery images={product.metadata?.gallery || []} name={name} />

        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{name}</h1>
          {category && (
            <p className="text-gray-500 uppercase text-sm tracking-wide mb-4">
              {getMetafieldValue(category.metadata?.name) || category.title}
            </p>
          )}

          {inventoryStatus && (
            <div className="mb-4">
              <InventoryBadge status={inventoryStatus} />
            </div>
          )}

          <PriceDisplay
            price={product.metadata?.price}
            compareAtPrice={product.metadata?.compare_at_price}
            size="lg"
          />

          {reviews.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              ★ {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </p>
          )}

          <div className="border-t border-gray-200 mt-6 pt-6">
            <VariantSelector variants={product.metadata?.variants || []} />
          </div>

          {description && (
            <div className="border-t border-gray-200 mt-6 pt-6">
              <h2 className="font-semibold uppercase text-sm tracking-wide mb-2">Description</h2>
              <p className="text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 border-t border-gray-200 pt-12">
        <h2 className="text-2xl font-black mb-6">Customer Reviews</h2>
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  )
}