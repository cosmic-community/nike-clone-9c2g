'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart'

export default function ClearCartOnMount() {
  const { clearCart, isHydrated } = useCart()

  useEffect(() => {
    if (isHydrated) {
      clearCart()
    }
    // Only run once the cart has hydrated from storage.
  }, [isHydrated, clearCart])

  return null
}
