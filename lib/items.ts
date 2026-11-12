export interface CapItem {
  type: string
  title: string
  url: string
  ref?: number
  id?: string
  image?: string
  price?: { amount: string; currency: string }
  availability?: string
  options?: Record<string, string>
  valid_until?: string
}

type ProductLine = {
  slug?: string
  name: string
  price: number
  image?: string
  color?: string
  size?: string
}

export function parseAccept(value: unknown): string[] | null {
  if (value == null || value === '') return []
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!list || list.some((entry) => typeof entry !== 'string')) return null
  return list.includes('items') ? ['items'] : []
}

/** Keeps items whose page is on this door. Images may live on a CDN. */
export function sameOriginItems(items: unknown, origin: string): CapItem[] {
  if (!Array.isArray(items)) return []
  let site = ''
  try {
    site = new URL(origin).origin
  } catch {
    return []
  }
  const kept: CapItem[] = []
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as CapItem
    if (typeof item.type !== 'string' || typeof item.title !== 'string' || typeof item.url !== 'string') continue
    try {
      if (new URL(item.url).origin !== site) continue
    } catch {
      continue
    }
    const next: CapItem = { ...item, title: item.title.slice(0, 200) }
    if (typeof next.image === 'string' && !next.image.startsWith('https://')) delete next.image
    kept.push(next)
    if (kept.length >= 20) break
  }
  return kept
}

export function productItems(lines: ProductLine[], origin: string): CapItem[] {
  const validUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  const items: CapItem[] = []
  for (const line of lines) {
    if (!line.slug || !line.name) continue
    const item: CapItem = {
      type: 'product',
      ref: items.length + 1,
      id: line.slug,
      title: line.name.slice(0, 200),
      url: `${origin}/products/${encodeURIComponent(line.slug)}`,
      price: { amount: Number(line.price || 0).toFixed(2), currency: 'USD' },
      availability: 'in_stock',
      valid_until: validUntil,
    }
    if (line.image?.startsWith('https://')) item.image = line.image
    const options: Record<string, string> = {}
    if (line.color) options.color = line.color
    if (line.size) options.size = line.size
    if (Object.keys(options).length) item.options = options
    items.push(item)
    if (items.length >= 20) break
  }
  return items
}
