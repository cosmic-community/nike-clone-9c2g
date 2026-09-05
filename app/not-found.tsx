import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-32 text-center">
      <h1 className="text-6xl font-black mb-4">404</h1>
      <p className="text-gray-500 mb-8">We couldn&apos;t find the page you were looking for.</p>
      <Link
        href="/"
        className="inline-block bg-black text-white font-bold uppercase tracking-wide px-8 py-4 rounded-full hover:bg-accent transition-colors"
      >
        Back Home
      </Link>
    </div>
  )
}