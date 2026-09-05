import type { Review } from '@/types'
import ReviewCard from '@/components/ReviewCard'

interface ReviewsListProps {
  reviews: Review[]
}

export default function ReviewsList({ reviews }: ReviewsListProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
        No reviews yet. Be the first to review this product.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}