import Link from 'next/link'
import type { Category } from '@/types'
import { getMetafieldValue } from '@/lib/utils'

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const name = getMetafieldValue(category.metadata?.name) || category.title
  const image = category.metadata?.hero_image

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative block aspect-[4/5] rounded-2xl overflow-hidden bg-black"
    >
      {image && (
        <img
          src={`${image.imgix_url}?w=1000&h=1250&fit=crop&auto=format,compress`}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6">
        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{name}</h3>
        <span className="text-sm text-gray-200 uppercase tracking-wide font-semibold border-b border-accent">
          Shop Now
        </span>
      </div>
    </Link>
  )
}