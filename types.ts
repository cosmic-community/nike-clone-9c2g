// Base Cosmic object interface
export interface CosmicObject {
  id: string
  slug: string
  title: string
  content?: string
  metadata: Record<string, any>
  type: string
  created_at: string
  modified_at: string
}

export interface CosmicMedia {
  url: string
  imgix_url: string
}

export interface Category extends CosmicObject {
  type: 'categories'
  metadata: {
    name?: string
    description?: string
    hero_image?: CosmicMedia
  }
}

// The variants metafield is stored as JSON; shape is flexible to support
// whatever color/size/sku/stock structure exists in the content model.
export interface ProductVariant {
  color?: string
  size?: string
  sku?: string
  stock?: number
  [key: string]: unknown
}

export interface Product extends CosmicObject {
  type: 'products'
  metadata: {
    product_name?: string
    description?: string
    price?: number
    compare_at_price?: number
    gallery?: CosmicMedia[]
    // inventory_status is a select field; exact option values are defined
    // in the content model, so we treat it as a flexible string here.
    inventory_status?: string
    featured?: boolean
    category?: Category
    variants?: ProductVariant[]
  }
}

export interface Review extends CosmicObject {
  type: 'reviews'
  metadata: {
    reviewer_name?: string
    rating?: number
    review_title?: string
    review_body?: string
    verified_purchase?: boolean
    product?: Product
  }
}

export interface CosmicResponse<T> {
  objects: T[]
  total: number
  limit?: number
  skip?: number
}