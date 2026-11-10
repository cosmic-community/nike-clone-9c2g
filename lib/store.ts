// Tiny server-only persistence layer on top of Cosmic objects.
// Used for customers, orders, and CAP (Concierge Agent Protocol) records.
import { cosmic } from '@/lib/cosmic'
import { hasStatus } from '@/lib/utils'

export interface StoredObject {
  id: string
  title: string
  slug: string
  created_at?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>
}

interface LooseObjectsApi {
  insertOne(data: Record<string, unknown>): Promise<{ object: StoredObject }>
  updateOne(id: string, data: Record<string, unknown>): Promise<{ object: StoredObject }>
}

const PROPS = ['id', 'title', 'slug', 'created_at', 'metadata']
const COSMIC_API = 'https://api.cosmicjs.com/v3'

// Reads skip the CDN (`use_cache=false`). This is state the app writes and reads back within
// seconds (bags, logins, confirmations, orders), and a cached read can miss the latest write.
// The SDK has no way to turn the cache off, so this calls the REST API directly.
async function findUncached(
  type: string,
  filter: Record<string, unknown>,
  limit: number
): Promise<{ objects?: StoredObject[] }> {
  const params = new URLSearchParams({
    query: JSON.stringify({ type, ...filter }),
    props: PROPS.join(','),
    status: 'any',
    sort: '-created_at',
    limit: String(limit),
    read_key: process.env.COSMIC_READ_KEY as string,
    use_cache: 'false',
  })
  const response = await fetch(`${COSMIC_API}/buckets/${process.env.COSMIC_BUCKET_SLUG}/objects?${params}`, {
    cache: 'no-store',
  })
  const body = (await response.json().catch(() => ({}))) as { objects?: StoredObject[]; message?: string }
  if (!response.ok) throw { status: response.status, message: body.message || `HTTP ${response.status}` }
  return body
}

export async function findMany(
  type: string,
  filter: Record<string, unknown> = {},
  limit = 50
): Promise<StoredObject[]> {
  try {
    const response = await findUncached(type, filter, limit)
    return response.objects ?? []
  } catch (error) {
    if (hasStatus(error) && error.status === 404) return []
    // A managed type that has not been created yet answers a metadata query with 400.
    if (hasStatus(error) && error.status === 400 && type in MANAGED_TYPES) return []
    throw error
  }
}

export async function findFirst(
  type: string,
  filter: Record<string, unknown>
): Promise<StoredObject | null> {
  const rows = await findMany(type, filter, 1)
  return rows[0] ?? null
}

export async function getById(type: string, id: string): Promise<StoredObject | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null
  return findFirst(type, { id })
}

interface LooseObjectTypesApi {
  insertOne(data: Record<string, unknown>): Promise<unknown>
}

type MetafieldType = 'text' | 'json'

// Types this app creates on first write. Cosmic rejects metadata keys that are not
// metafields on the type, so every key written to these types must be listed here.
const MANAGED_TYPES: Record<string, { title: string; singular: string; fields: Record<string, MetafieldType> }> = {
  carts: {
    title: 'Carts',
    singular: 'Cart',
    fields: { customer_id: 'text', items: 'json' },
  },
  'cap-confirmations': {
    title: 'CAP Confirmations',
    singular: 'CAP Confirmation',
    fields: {
      confirmation_id: 'text',
      cap_from: 'text',
      client_name: 'text',
      account: 'text',
      status: 'text',
      summary: 'text',
      authorization_details: 'json',
      lines: 'json',
      source: 'text',
      expires_at: 'text',
      stripe_session_id: 'text',
      stripe_session_url: 'text',
      result: 'json',
    },
  },
}

async function createManagedType(type: string): Promise<boolean> {
  const spec = MANAGED_TYPES[type]
  if (!spec) return false
  const api = cosmic.objectTypes as unknown as LooseObjectTypesApi
  try {
    await api.insertOne({
      title: spec.title,
      slug: type,
      singular: spec.singular,
      metafields: Object.entries(spec.fields).map(([key, fieldType]) => ({
        title: key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        key,
        type: fieldType,
        required: false,
      })),
    })
  } catch (error) {
    // Another request may have created it first. The retry decides.
    console.error(`[store] could not create object type ${type}`, error)
  }
  return true
}

export async function insertObject(
  type: string,
  title: string,
  metadata: Record<string, unknown>
): Promise<StoredObject> {
  const api = cosmic.objects as unknown as LooseObjectsApi
  try {
    const response = await api.insertOne({ type, title, metadata, status: 'published' })
    return response.object
  } catch (error) {
    const missingType = hasStatus(error) && error.status === 400 && String((error as { message?: unknown }).message ?? '').includes("valid 'type'")
    if (!missingType || !(await createManagedType(type))) throw error
    const response = await api.insertOne({ type, title, metadata, status: 'published' })
    return response.object
  }
}

export async function updateMetadata(
  object: StoredObject,
  patch: Record<string, unknown>
): Promise<void> {
  const api = cosmic.objects as unknown as LooseObjectsApi
  await api.updateOne(object.id, { metadata: { ...object.metadata, ...patch } })
}
