import type { Review } from '@/types'
import { getMetafieldValue } from '@/lib/utils'
import StarRating from '@/components/StarRating'

interface ReviewCardProps {
  review: Review
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const reviewerName = getMetafieldValue(review.metadata?.reviewer_name) || 'Anonymous'
  const title = getMetafieldValue(review.metadata?.review_title)
  const body = getMetafieldValue(review.metadata?.review_body)
  const rating = Number(review.metadata?.rating) || 0
  const isVerified = Boolean(review.metadata?.verified_purchase)

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <StarRating rating={rating} size="sm" />
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
            ✓ Verified Purchase
          </span>
        )}
      </div>
      {title && <h4 className="font-bold text-base mb-2">{title}</h4>}
      {body && <p className="text-gray-600 text-sm leading-relaxed mb-3">{body}</p>}
      <p className="text-sm font-semibold text-gray-800">{reviewerName}</p>
    </div>
  )
}