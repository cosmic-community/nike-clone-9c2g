import { getProducts, getProductsByCategory, getCategories, sortProducts, getMetafieldValue } from '@/lib/cosmic'
import ProductGrid from '@/components/ProductGrid'
import CategoryFilterBar from '@/components/CategoryFilterBar'
import type { Category } from '@/types'

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, sort } = await searchParams
  const categories = await getCategories()

  let activeCategory: Category | undefined
  if (category) {
    activeCategory = categories.find((c) => c.slug === category)
  }

  let products = activeCategory
    ? await getProductsByCategory(activeCategory.id)
    : await getProducts()

  products = sortProducts(products, sort || 'newest')

  const heading = activeCategory
    ? getMetafieldValue(activeCategory.metadata?.name) || activeCategory.title
    : 'All Products'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">{heading}</h1>
        <p className="text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''}</p>
      </div>

      <CategoryFilterBar categories={categories} activeSlug={category} sort={sort} />

      <ProductGrid products={products} />
    </div>
  )
}