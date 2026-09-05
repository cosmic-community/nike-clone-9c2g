import type { Category } from '@/types'
import CategoryCard from '@/components/CategoryCard'

interface CategoryShowcaseProps {
  categories: Category[]
}

export default function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">Shop by Category</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.slice(0, 6).map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  )
}