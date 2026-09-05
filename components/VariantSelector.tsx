'use client'

import { useState, useMemo } from 'react'
import type { ProductVariant } from '@/types'
import AddToBag from '@/components/AddToBag'

interface VariantSelectorProps {
  variants: ProductVariant[]
  productId: string
  slug: string
  name: string
  price: number
  priceId?: string
  image?: string
}

export default function VariantSelector({
  variants,
  productId,
  slug,
  name,
  price,
  priceId,
  image,
}: VariantSelectorProps) {
  const safeVariants = variants || []

  const colors = useMemo(() => {
    const set = new Set<string>()
    safeVariants.forEach((v) => {
      if (v.color) set.add(String(v.color))
    })
    return Array.from(set)
  }, [safeVariants])

  const sizes = useMemo(() => {
    const set = new Set<string>()
    safeVariants.forEach((v) => {
      if (v.size) set.add(String(v.size))
    })
    return Array.from(set)
  }, [safeVariants])

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] || null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const matchedVariant = safeVariants.find(
    (v) =>
      (!selectedColor || String(v.color) === selectedColor) &&
      (!selectedSize || String(v.size) === selectedSize)
  )

  const isOutOfStock =
    Boolean(matchedVariant) &&
    typeof matchedVariant?.stock === 'number' &&
    (matchedVariant.stock as number) <= 0

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <h3 className="font-semibold uppercase text-sm tracking-wide mb-3">
            Color{selectedColor ? `: ${selectedColor}` : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedColor === color
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <h3 className="font-semibold uppercase text-sm tracking-wide mb-3">
            Size{selectedSize ? `: ${selectedSize}` : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`min-w-[3rem] px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedSize === size
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-black'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <AddToBag
        productId={productId}
        slug={slug}
        name={name}
        price={price}
        priceId={priceId}
        image={image}
        color={selectedColor || undefined}
        size={selectedSize || undefined}
        requiresSize={sizes.length > 0}
        disabled={isOutOfStock}
      />
    </div>
  )
}
