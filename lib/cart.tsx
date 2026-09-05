'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem } from '@/types'

const STORAGE_KEY = 'swsh-cart-v1'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  isHydrated: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

export function buildCartKey(productId: string, color?: string, size?: string): string {
  return [productId, color || '', size || ''].join('::')
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.productId === 'string' &&
    typeof candidate.priceId === 'string' &&
    typeof candidate.quantity === 'number'
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load persisted cart on mount (client only, so SSR markup stays stable).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setItems(parsed.filter(isCartItem))
        }
      }
    } catch {
      // Corrupt or unavailable storage: start with an empty bag.
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }, [items, isHydrated])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      items,
      itemCount,
      subtotal,
      isHydrated,
      addItem: (item, quantity = 1) => {
        const key = buildCartKey(item.productId, item.color, item.size)
        setItems((current) => {
          const existing = current.find((entry) => entry.key === key)
          if (existing) {
            return current.map((entry) =>
              entry.key === key ? { ...entry, quantity: entry.quantity + quantity } : entry
            )
          }
          return [...current, { ...item, key, quantity }]
        })
      },
      removeItem: (key) => {
        setItems((current) => current.filter((entry) => entry.key !== key))
      },
      updateQuantity: (key, quantity) => {
        setItems((current) => {
          if (quantity <= 0) {
            return current.filter((entry) => entry.key !== key)
          }
          return current.map((entry) => (entry.key === key ? { ...entry, quantity } : entry))
        })
      },
      clearCart: () => setItems([]),
    }
  }, [items, isHydrated])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
