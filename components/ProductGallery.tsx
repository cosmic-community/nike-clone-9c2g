'use client'

import { useState } from 'react'

interface GalleryImage {
  url: string
  imgix_url: string
}

interface ProductGalleryProps {
  images: GalleryImage[]
  name: string
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
        No image available
      </div>
    )
  }

  const activeImage = images[activeIndex] || images[0]

  return (
    <div>
      <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
        {activeImage && (
          <img
            src={`${activeImage.imgix_url}?w=1200&h=1200&fit=crop&auto=format,compress`}
            alt={name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                index === activeIndex ? 'border-black' : 'border-transparent'
              }`}
            >
              <img
                src={`${image.imgix_url}?w=200&h=200&fit=crop&auto=format,compress`}
                alt={`${name} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}