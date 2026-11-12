'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem } from '@/types'

// Guest bag only. A signed-in shopper's bag lives on the server so their AI agent can change it too.
const STORAGE_KEY = 'swsh-cart-v1'
const MERGED_KEY = 'swsh-cart-guest-merged'
const REFRESH_MS = 20_000

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  reload: () => Promise<void>
  isHydrated: boolean
}

export interface BagLine {
  key: string
  productId?: string
  color?: string
  size?: string
  quantity: number
}

type CartOp =
  | { op: 'add'; item: Omit<CartItem, 'key' | 'quantity'>; quantity: number }
  | { op: 'update'; key: string; quantity: number }
  | { op: 'remove'; key: string }
  | { op: 'clear' }
  | { op: 'merge'; items: CartItem[] }

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

function applyLocal(items: CartItem[], op: CartOp): CartItem[] {
  switch (op.op) {
    case 'add': {
      const key = buildCartKey(op.item.productId, op.item.color, op.item.size)
      const existing = items.find((entry) => entry.key === key)
      if (existing) {
        return items.map((entry) => (entry.key === key ? { ...entry, quantity: entry.quantity + op.quantity } : entry))
      }
      return [...items, { ...op.item, key, quantity: op.quantity }]
    }
    case 'update':
      if (op.quantity <= 0) return items.filter((entry) => entry.key !== op.key)
      return items.map((entry) => (entry.key === op.key ? { ...entry, quantity: op.quantity } : entry))
    case 'remove':
      return items.filter((entry) => entry.key !== op.key)
    case 'clear':
      return []
    case 'merge':
      return op.items.reduce((acc, item) => applyLocal(acc, { op: 'add', item, quantity: item.quantity }), items)
  }
}

function readGuestCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return []
  }
}

function writeGuestCart(items: CartItem[]) {
  try {
    if (items.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function guestAlreadyMerged(): boolean {
  try {
    return window.localStorage.getItem(MERGED_KEY) === '1'
  } catch {
    return false
  }
}

function markGuestMerged(merged: boolean) {
  try {
    if (merged) window.localStorage.setItem(MERGED_KEY, '1')
    else window.localStorage.removeItem(MERGED_KEY)
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function sameBagLine(entry: CartItem, line: BagLine): boolean {
  if (line.key && entry.key === line.key) return true
  if (!line.productId || entry.productId !== line.productId) return false
  return (entry.color || '') === (line.color || '') && (entry.size || '') === (line.size || '')
}

/** Drops purchased quantities from the guest bag before sign-in hydration can merge them back. */
export function stripGuestLines(lines: BagLine[]) {
  if (typeof window === 'undefined' || lines.length === 0) return
  const guest = readGuestCart()
  if (!guest.length) return
  const next = guest
    .map((entry) => {
      const taken = lines.find((line) => sameBagLine(entry, line))
      return taken ? { ...entry, quantity: entry.quantity - taken.quantity } : entry
    })
    .filter((entry) => entry.quantity > 0)
  writeGuestCart(next)
}

async function sendServerOp(op: CartOp): Promise<CartItem[] | null> {
  const response = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(op),
  })
  if (!response.ok) return null
  const data = (await response.json()) as { items?: unknown }
  return Array.isArray(data.items) ? data.items.filter(isCartItem) : null
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const signedIn = useRef(false)
  const pending = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as { signedIn?: boolean; items?: unknown }
      signedIn.current = Boolean(data.signedIn)
      if (!signedIn.current || pending.current > 0) return
      setItems(Array.isArray(data.items) ? data.items.filter(isCartItem) : [])
    } catch {
      // Offline: keep what we have.
    }
  }, [])

  // Load the bag on mount. A guest bag left over from before sign-in moves into the account.
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const guest = readGuestCart()
      setItems(guest)
      await refresh()
      if (cancelled) return
      // Once per browser. Repeating this after checkout puts the paid lines back in the bag.
      if (signedIn.current && guest.length && !guestAlreadyMerged()) {
        markGuestMerged(true)
        writeGuestCart([])
        const merged = await sendServerOp({ op: 'merge', items: guest }).catch(() => null)
        if (!merged) {
          markGuestMerged(false)
          writeGuestCart(guest)
        } else if (!cancelled) {
          setItems(merged)
        }
      }
      if (!cancelled) setIsHydrated(true)
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Pick up items the shopper's agent added while this tab was open.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && signedIn.current) refresh()
    }
    const timer = window.setInterval(onVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  const dispatch = useCallback((op: CartOp) => {
    setItems((current) => {
      const next = applyLocal(current, op)
      if (!signedIn.current) {
        writeGuestCart(next)
        if (next.length) markGuestMerged(false)
      }
      return next
    })
    if (!signedIn.current) return
    pending.current += 1
    sendServerOp(op)
      .then((serverItems) => {
        if (serverItems && pending.current === 1) setItems(serverItems)
      })
      .catch(() => undefined)
      .finally(() => {
        pending.current -= 1
      })
  }, [])

  // Stable so effects that depend on them (e.g. ClearCartOnMount) run once.
  const actions = useMemo(
    () => ({
      addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity = 1) => dispatch({ op: 'add', item, quantity }),
      removeItem: (key: string) => dispatch({ op: 'remove', key }),
      updateQuantity: (key: string, quantity: number) => dispatch({ op: 'update', key, quantity }),
      clearCart: () => dispatch({ op: 'clear' }),
    }),
    [dispatch]
  )

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { items, itemCount, subtotal, isHydrated, reload: refresh, ...actions }
  }, [items, isHydrated, actions, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
