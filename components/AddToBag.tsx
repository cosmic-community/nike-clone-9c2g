'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart'

interface AddToBagProps {
  productId: string
  slug: string
  name: string
  price: number
  priceId?: string
  image?: string
  color?: string
  size?: string
  requiresSize: boolean
  disabled?: boolean
  disabledLabel?: string
}

export default function AddToBag({
  productId,
  slug,
  name,
  price,
  priceId,
  image,
  color,
  size,
  requiresSize,
  disabled = false,
  disabledLabel = 'Out of Stock',
}: AddToBagProps) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notPurchasable = !priceId

  function handleAdd() {
    if (requiresSize && !size) {
      setError('Please select a size.')
      return
    }
    if (!priceId) {
      setError('This product is not available for online checkout yet.')
      return
    }

    setError(null)
    addItem({ productId, slug, name, price, priceId, image, color, size })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full py-4 rounded-full font-bold uppercase tracking-wide bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        {disabledLabel}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAdd}
        disabled={notPurchasable}
        className={`w-full py-4 rounded-full font-bold uppercase tracking-wide transition-colors ${
          notPurchasable
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-accent text-white hover:bg-black'
        }`}
      >
        {added ? 'Added to Bag ✓' : notPurchasable ? 'Unavailable' : 'Add to Bag'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
