// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getCategory, getProductsByCategory, getMetafieldValue } from '@/lib/cosmic'
import ProductGrid from '@/components/ProductGrid'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = await getCategory(slug)

  if (!category) {
    notFound()
  }

  const products = await getProductsByCategory(category.id)
  const name = getMetafieldValue(category.metadata?.name) || category.title
  const description = getMetafieldValue(category.metadata?.description)
  const heroImage = category.metadata?.hero_image

  return (
    <div>
      <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden bg-black">
        {heroImage && (
          <img
            src={`${heroImage.imgix_url}?w=2000&h=1200&fit=crop&auto=format,compress`}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
        )}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">{name}</h1>
          {description && <p className="text-gray-200 max-w-xl">{description}</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-500 mb-6">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <ProductGrid products={products} />
      </div>
    </div>
  )
}