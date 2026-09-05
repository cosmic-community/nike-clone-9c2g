import Link from 'next/link'
import Hero from '@/components/Hero'
import ProductGrid from '@/components/ProductGrid'
import CategoryShowcase from '@/components/CategoryShowcase'
import { getFeaturedProducts, getCategories } from '@/lib/cosmic'

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(4),
    getCategories(),
  ])

  const firstProduct = featuredProducts[0]
  const heroImage = firstProduct?.metadata?.gallery?.[0]?.imgix_url

  return (
    <div>
      <Hero imageUrl={heroImage} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Featured Drops</h2>
          <Link
            href="/products"
            className="text-sm font-semibold uppercase tracking-wide border-b-2 border-black hover:border-accent hover:text-accent transition-colors"
          >
            Shop All
          </Link>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>

      <CategoryShowcase categories={categories} />

      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">JUST DO IT.</h2>
          <p className="text-gray-300 max-w-xl mx-auto mb-8">
            Performance gear engineered for athletes. Explore the full collection and find your next favorite pair.
          </p>
          <Link
            href="/products"
            className="inline-block bg-accent text-white font-bold uppercase tracking-wide px-8 py-4 rounded-full hover:bg-white hover:text-black transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  )
}