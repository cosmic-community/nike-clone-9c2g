import Link from 'next/link'

interface HeroProps {
  imageUrl?: string
}

export default function Hero({ imageUrl }: HeroProps) {
  return (
    <section className="relative w-full h-[80vh] min-h-[500px] bg-black overflow-hidden">
      {imageUrl && (
        <img
          src={`${imageUrl}?w=2400&h=1600&fit=crop&auto=format,compress`}
          alt="Featured athletic gear"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="relative z-10 h-full flex flex-col items-start justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <p className="text-accent font-bold uppercase tracking-widest mb-4">New Season Collection</p>
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6 max-w-3xl">
          JUST DO IT.
        </h1>
        <Link
          href="/products"
          className="inline-block bg-white text-black font-bold uppercase tracking-wide px-8 py-4 rounded-full hover:bg-accent hover:text-white transition-colors"
        >
          Shop Now
        </Link>
      </div>
    </section>
  )
}