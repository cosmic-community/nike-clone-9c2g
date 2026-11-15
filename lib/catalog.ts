import type { Product, ProductVariant } from '@/types'
import { getMetafieldValue } from '@/lib/utils'

export function productOutOfStock(product: Product) {
  return String(getMetafieldValue(product.metadata?.inventory_status) || '').toLowerCase().includes('out')
}

export function variantAvailable(product: Product, variant: ProductVariant) {
  if (productOutOfStock(product)) return false
  return typeof variant.stock !== 'number' || variant.stock > 0
}

export function productAvailable(product: Product) {
  const variants = product.metadata?.variants || []
  if (!variants.length) return !productOutOfStock(product)
  return variants.some((variant) => variantAvailable(product, variant))
}
