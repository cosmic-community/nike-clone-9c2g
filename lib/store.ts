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

export async function findMany(
  type: string,
  filter: Record<string, unknown> = {},
  limit = 50
): Promise<StoredObject[]> {
  try {
    const response = (await cosmic.objects
      .find({ type, ...filter })
      .props(PROPS)
      .status('any')
      .sort('-created_at')
      .limit(limit)) as { objects?: StoredObject[] }
    return response.objects ?? []
  } catch (error) {
    if (hasStatus(error) && error.status === 404) return []
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

export async function insertObject(
  type: string,
  title: string,
  metadata: Record<string, unknown>
): Promise<StoredObject> {
  const api = cosmic.objects as unknown as LooseObjectsApi
  const response = await api.insertOne({ type, title, metadata, status: 'published' })
  return response.object
}

export async function updateMetadata(
  object: StoredObject,
  patch: Record<string, unknown>
): Promise<void> {
  const api = cosmic.objects as unknown as LooseObjectsApi
  await api.updateOne(object.id, { metadata: { ...object.metadata, ...patch } })
}
