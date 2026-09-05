interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md'
}

export default function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const starSize = size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className={`flex items-center gap-0.5 ${starSize}`} aria-label={`Rated ${rating} out of 5`}>
      {stars.map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'text-accent' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  )
}