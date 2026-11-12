'use client'

import { useEffect, useLayoutEffect } from 'react'
import { stripGuestLines, useCart, type BagLine } from '@/lib/cart'

/** The paid lines leave the guest bag before hydration, then the badge re-reads the account bag. */
export default function ReleasePurchased({ lines }: { lines: BagLine[] }) {
  const { isHydrated, reload } = useCart()

  useLayoutEffect(() => {
    stripGuestLines(lines)
  }, [lines])

  useEffect(() => {
    if (!isHydrated) return
    reload()
  }, [isHydrated, reload, lines])

  return null
}
