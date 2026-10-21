import { sha256, verifyToken } from '@/lib/auth'
import { readForm, type AccessPayload } from '@/lib/oauth'
import { findFirst, getById, updateMetadata } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// RFC 7009: always 200, whether or not the token was known.
export async function POST(request: Request) {
  const form = await readForm(request)
  const token = form.get('token') || ''
  const clientId = (form.get('client_id') || '').trim()

  try {
    if (token && clientId) {
      const access = verifyToken<AccessPayload>(token, 'cap_access')
      const login = access
        ? await getById('cap-logins', access.lid)
        : await findFirst('cap-logins', { 'metadata.refresh_hash': sha256(token) })

      if (login && login.metadata.cap_from === clientId && login.metadata.status === 'active') {
        await updateMetadata(login, { status: 'revoked', refresh_hash: '' })
      }
    }
  } catch (error) {
    console.error('[oauth] revoke failed', error)
  }

  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
