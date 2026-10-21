// Concierge Agent Protocol (CAP 1.0) helpers. https://conciergeprotocol.org/spec
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import type { AccessPayload } from '@/lib/oauth'
import { getById } from '@/lib/store'

export interface CapCaller {
  capFrom: string
  account: string | null
}

export interface CapMessageData {
  id: string
  status: 'working' | 'done' | 'failed'
  reply?: string
  error?: { code: string; message: string }
  created_at: string
  finished_at?: string
  // Internal only, never returned to callers:
  conversation_id?: string | null
  turn?: number
}

export function capError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** Only the fields the spec allows. Never internal ids. */
export function toPublic(data: CapMessageData) {
  return {
    id: data.id,
    status: data.status,
    ...(data.status === 'done' && data.reply ? { reply: data.reply } : {}),
    ...(data.status === 'failed' && data.error ? { error: data.error } : {}),
    created_at: data.created_at,
    ...(data.finished_at ? { finished_at: data.finished_at } : {}),
  }
}

export async function authenticateCap(request: Request): Promise<CapCaller | NextResponse> {
  const version = (request.headers.get('cap-version') || '').trim()
  if (!version) return capError('invalid_request', 'The CAP-Version header is required.', 400)
  if (!/^1(\.\d+)?$/.test(version)) return capError('version_not_supported', 'This door speaks CAP 1.x.', 400)

  const capFrom = (request.headers.get('cap-from') || '').trim()
  if (!/^agent:\S{1,200}$/.test(capFrom)) {
    return capError('invalid_request', 'The CAP-From header must look like agent:{id}.', 400)
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) return { capFrom, account: null }

  const match = authorization.match(/^Bearer\s+(\S+)$/i)
  if (!match) return capError('invalid_request', 'Authorization must be a Bearer token.', 400)

  const payload = verifyToken<AccessPayload>(match[1], 'cap_access')
  if (!payload) return capError('unauthorized', 'This login has expired. Please log in again.', 401)
  if (payload.cap !== capFrom) return capError('forbidden', 'This login belongs to a different agent.', 403)

  const login = await getById('cap-logins', payload.lid)
  if (!login || login.metadata?.status !== 'active') {
    return capError('unauthorized', 'This login was revoked. Please log in again.', 401)
  }

  return { capFrom, account: payload.sub }
}
