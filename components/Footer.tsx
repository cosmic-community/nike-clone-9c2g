import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold uppercase text-sm tracking-wide mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Categories
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold uppercase text-sm tracking-wide mb-4">Help</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Order Status</li>
              <li>Shipping</li>
              <li>Returns</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold uppercase text-sm tracking-wide mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>About Us</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold uppercase text-sm tracking-wide mb-4">Follow</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Instagram</li>
              <li>X</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-sm text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} SWSH. All rights reserved.</p>
          <p>Built for demonstration purposes.</p>
        </div>
      </div>
    </footer>
  )
}