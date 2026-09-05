interface InventoryBadgeProps {
  status: string
  compact?: boolean
}

export default function InventoryBadge({ status, compact = false }: InventoryBadgeProps) {
  if (!status) {
    return null
  }

  const normalized = status.toLowerCase()
  let colorClasses = 'bg-gray-100 text-gray-700'

  if (normalized.includes('out')) {
    colorClasses = 'bg-red-100 text-red-700'
  } else if (normalized.includes('low')) {
    colorClasses = 'bg-yellow-100 text-yellow-800'
  } else if (normalized.includes('in stock') || normalized.includes('available')) {
    colorClasses = 'bg-green-100 text-green-700'
  }

  return (
    <span
      className={`inline-block font-semibold uppercase tracking-wide rounded-full ${colorClasses} ${
        compact ? 'text-xs px-2 py-1' : 'text-xs px-3 py-1.5'
      }`}
    >
      {status}
    </span>
  )
}