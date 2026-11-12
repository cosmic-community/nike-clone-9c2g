// Concierge Agent Protocol (CAP 1.0) helpers. https://conciergeprotocol.org/spec
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import type { AccessPayload } from '@/lib/oauth'
import { getById } from '@/lib/store'

export interface CapCaller {
  capFrom: string
  account: string | null
  scope: string | null
  clientName: string
}

export interface CapMessageData {
  id: string
  status: 'working' | 'done' | 'failed'
  reply?: string
  items?: unknown[]
  as_of?: string
  error?: { code: string; message: string }
  created_at: string
  finished_at?: string
  // Internal only, never returned to callers:
  conversation_id?: string | null
  turn?: number
  confirmation_id?: string
}

export function capError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** Only the fields the spec allows. Never internal ids. */
export function toPublic(data: CapMessageData, confirmation?: Record<string, unknown> | null) {
  return {
    id: data.id,
    status: data.status,
    ...(data.status === 'done' && data.reply ? { reply: data.reply } : {}),
    ...(data.status === 'done' && data.items?.length ? { items: data.items, as_of: data.as_of } : {}),
    ...(data.status === 'failed' && data.error ? { error: data.error } : {}),
    ...(data.status === 'done' && confirmation ? { confirmation } : {}),
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
  if (!authorization) return { capFrom, account: null, scope: null, clientName: '' }

  const match = authorization.match(/^Bearer\s+(\S+)$/i)
  const token = match?.[1]
  if (!token) return capError('invalid_request', 'Authorization must be a Bearer token.', 400)

  const payload = verifyToken<AccessPayload>(token, 'cap_access')
  if (!payload) return capError('unauthorized', 'This login has expired. Please log in again.', 401)
  if (payload.cap !== capFrom) return capError('forbidden', 'This login belongs to a different agent.', 403)

  const login = await getById('cap-logins', payload.lid)
  if (!login || login.metadata?.status !== 'active') {
    return capError('unauthorized', 'This login was revoked. Please log in again.', 401)
  }

  return {
    capFrom,
    account: payload.sub,
    scope: payload.scope || 'read',
    clientName: String(login.metadata.client_name || ''),
  }
}

const SPEC_URL = 'https://conciergeprotocol.org/cap.txt'

/** Plain text for GET /cap/v1. Callers open this before they post. */
export function capHelp(origin: string) {
  const capUrl = `${origin.replace(/\/$/, '')}/cap/v1`
  return [
    'Leo answers questions for this company through the Concierge Agent Protocol (CAP).',
    '',
    `POST ${capUrl}/messages`,
    'CAP-Version: 1.0',
    'CAP-From: agent:{your-id}',
    'Content-Type: application/json',
    '',
    '{"message": "your question"}',
    '',
    'If you can only open URLs, ask a public question with a GET:',
    `${capUrl}/messages?from=agent:{your-id}&message={your question, URL-encoded}`,
    '',
    '200 means the reply is ready. 202 means it is still working: wait Retry-After seconds, then GET the Location URL.',
    'Items: add "accept": ["items"] to the JSON, or accept=items to the GET, to also receive typed results.',
    `Spec: ${SPEC_URL}`,
    '',
  ].join('\n')
}
