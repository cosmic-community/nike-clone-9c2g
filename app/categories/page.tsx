import { getCategories } from '@/lib/cosmic'
import CategoryCard from '@/components/CategoryCard'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-8">Shop by Category</h1>
      {categories.length === 0 ? (
        <p className="text-gray-500">No categories available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}