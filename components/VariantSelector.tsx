'use client'

import { useState, useMemo } from 'react'
import type { ProductVariant } from '@/types'

interface VariantSelectorProps {
  variants: ProductVariant[]
}

export default function VariantSelector({ variants }: VariantSelectorProps) {
  const colors = useMemo(() => {
    const set = new Set<string>()
    variants.forEach((v) => {
      if (v.color) set.add(String(v.color))
    })
    return Array.from(set)
  }, [variants])

  const sizes = useMemo(() => {
    const set = new Set<string>()
    variants.forEach((v) => {
      if (v.size) set.add(String(v.size))
    })
    return Array.from(set)
  }, [variants])

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] || null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  if (!variants || variants.length === 0) {
    return null
  }

  const matchedVariant = variants.find(
    (v) =>
      (!selectedColor || String(v.color) === selectedColor) &&
      (!selectedSize || String(v.size) === selectedSize)
  )

  const isOutOfStock =
    Boolean(matchedVariant) && typeof matchedVariant?.stock === 'number' && (matchedVariant.stock as number) <= 0

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

      <button
        type="button"
        disabled={isOutOfStock}
        className={`w-full py-4 rounded-full font-bold uppercase tracking-wide transition-colors ${
          isOutOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-accent text-white hover:bg-black'
        }`}
      >
        {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
      </button>
    </div>
  )
}