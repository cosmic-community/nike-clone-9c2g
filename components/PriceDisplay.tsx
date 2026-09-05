interface PriceDisplayProps {
  price?: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function PriceDisplay({ price, compareAtPrice, size = 'md' }: PriceDisplayProps) {
  const currentPrice = typeof price === 'number' ? price : 0
  const hasDiscount = typeof compareAtPrice === 'number' && compareAtPrice > currentPrice

  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'
  const compareSize = size === 'lg' ? 'text-lg' : 'text-sm'

  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold ${textSize} ${hasDiscount ? 'text-accent' : 'text-black'}`}>
        ${currentPrice.toFixed(2)}
      </span>
      {hasDiscount && typeof compareAtPrice === 'number' && (
        <span className={`text-gray-400 line-through ${compareSize}`}>${compareAtPrice.toFixed(2)}</span>
      )}
    </div>
  )
}