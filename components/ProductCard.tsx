import Link from 'next/link'
import type { Product } from '@/types'
import { getMetafieldValue } from '@/lib/utils'
import PriceDisplay from '@/components/PriceDisplay'
import InventoryBadge from '@/components/InventoryBadge'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const name = getMetafieldValue(product.metadata?.product_name) || product.title
  const image = product.metadata?.gallery?.[0]
  const inventoryStatus = getMetafieldValue(product.metadata?.inventory_status)

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
        {image && (
          <img
            src={`${image.imgix_url}?w=800&h=800&fit=crop&auto=format,compress`}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {inventoryStatus && (
          <div className="absolute top-3 left-3">
            <InventoryBadge status={inventoryStatus} compact />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-base mb-1 group-hover:text-accent transition-colors">{name}</h3>
      <PriceDisplay
        price={product.metadata?.price}
        compareAtPrice={product.metadata?.compare_at_price}
        size="sm"
      />
    </Link>
  )
}