'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Category } from '@/types'
import { getMetafieldValue } from '@/lib/utils'

interface MobileMenuProps {
  categories: Category[]
}

export default function MobileMenu({ categories }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu" className="p-2 -mr-2">
        <span className="block w-6 h-0.5 bg-black mb-1.5" />
        <span className="block w-6 h-0.5 bg-black mb-1.5" />
        <span className="block w-6 h-0.5 bg-black" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 top-16 bg-white z-30 overflow-y-auto">
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="text-lg font-bold uppercase tracking-wide py-2 border-b border-gray-100"
            >
              All Products
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                onClick={() => setIsOpen(false)}
                className="text-lg font-bold uppercase tracking-wide py-2 border-b border-gray-100"
              >
                {getMetafieldValue(category.metadata?.name) || category.title}
              </Link>
            ))}
            <Link
              href="/categories"
              onClick={() => setIsOpen(false)}
              className="text-lg font-bold uppercase tracking-wide py-2 border-b border-gray-100"
            >
              Categories
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}