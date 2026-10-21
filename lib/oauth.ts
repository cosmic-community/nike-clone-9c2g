// OAuth 2.1 device authorization grant (RFC 8628) for CAP callers.
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { randomToken, sha256, signToken } from '@/lib/auth'
import { findFirst, updateMetadata, type StoredObject } from '@/lib/store'

export const ACCESS_TTL = 60 * 60 // 1 hour
export const DEVICE_TTL = 10 * 60 // 10 minutes
const USER_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ'

export interface AccessPayload {
  kind: 'cap_access'
  sub: string // customer id
  cap: string // CAP-From the token is bound to
  lid: string // cap-logins object id (for revocation)
  scope: string
  exp: number
}

export function siteOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  return new URL(request.url).origin
}

export function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function readForm(request: Request): Promise<URLSearchParams> {
  try {
    return new URLSearchParams(await request.text())
  } catch {
    return new URLSearchParams()
  }
}

export function makeUserCode(): string {
  const bytes = randomBytes(8)
  const chars = Array.from(bytes, (b) => USER_CODE_ALPHABET[b % USER_CODE_ALPHABET.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4)}`
}

export function normalizeUserCode(raw: string): string {
  const letters = raw.toUpperCase().replace(/[^A-Z]/g, '')
  return letters.length === 8 ? `${letters.slice(0, 4)}-${letters.slice(4)}` : ''
}

export function isExpired(login: StoredObject): boolean {
  const at = Date.parse(String(login.metadata?.expires_at || ''))
  return !Number.isFinite(at) || at < Date.now()
}

export async function findPendingLogin(userCode: string): Promise<StoredObject | null> {
  if (!userCode) return null
  const login = await findFirst('cap-logins', {
    'metadata.user_code': userCode,
    'metadata.status': 'pending',
  })
  if (!login || isExpired(login)) return null
  return login
}

/** Issues an access + refresh token pair and rotates the stored refresh hash. */
export async function issueTokens(login: StoredObject) {
  const refreshToken = randomToken(32)
  const scope = String(login.metadata.scope || 'read')
  const payload: AccessPayload = {
    kind: 'cap_access',
    sub: String(login.metadata.account),
    cap: String(login.metadata.cap_from),
    lid: login.id,
    scope,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL,
  }
  const accessToken = signToken({ ...payload })

  await updateMetadata(login, {
    status: 'active',
    refresh_hash: sha256(refreshToken),
    device_code_hash: '', // a device code yields a token once
  })

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL,
      refresh_token: refreshToken,
      scope,
    },
    { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } }
  )
}
