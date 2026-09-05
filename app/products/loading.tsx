export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="h-10 w-64 bg-gray-200 rounded mb-2 animate-pulse" />
      <div className="h-4 w-32 bg-gray-200 rounded mb-8 animate-pulse" />
      <div className="h-12 w-full bg-gray-100 rounded-full mb-8 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-square bg-gray-200 rounded-2xl mb-4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}