'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Category } from '@/types'
import { getMetafieldValue } from '@/lib/utils'

interface CategoryFilterBarProps {
  categories: Category[]
  activeSlug?: string
  sort?: string
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
]

function buildHref(category?: string, sort?: string): string {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sort) params.set('sort', sort)
  const query = params.toString()
  return query ? `/products?${query}` : '/products'
}

export default function CategoryFilterBar({ categories, activeSlug, sort }: CategoryFilterBarProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200">
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref(undefined, sort)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            !activeSlug ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'
          }`}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={buildHref(category.slug, sort)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              activeSlug === category.slug
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-300 hover:border-black'
            }`}
          >
            {getMetafieldValue(category.metadata?.name) || category.title}
          </Link>
        ))}
      </div>

      <select
        value={sort || 'newest'}
        onChange={(e) => router.push(buildHref(activeSlug, e.target.value))}
        className="border border-gray-300 rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus:border-black bg-white"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}