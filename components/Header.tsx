import Link from 'next/link'
import { getCategories, getMetafieldValue } from '@/lib/cosmic'
import MobileMenu from '@/components/MobileMenu'

export default async function Header() {
  const categories = await getCategories()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            SWSH.
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/products"
              className="text-sm font-semibold uppercase tracking-wide hover:text-accent transition-colors"
            >
              All Products
            </Link>
            {categories.slice(0, 4).map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="text-sm font-semibold uppercase tracking-wide hover:text-accent transition-colors"
              >
                {getMetafieldValue(category.metadata?.name) || category.title}
              </Link>
            ))}
            <Link
              href="/categories"
              className="text-sm font-semibold uppercase tracking-wide hover:text-accent transition-colors"
            >
              Categories
            </Link>
          </nav>

          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  )
}