// Super lightweight auth: scrypt password hashes + HMAC-signed tokens.
// No extra dependencies. Requires AUTH_SECRET (32+ chars) in the environment.
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { findFirst, getById, type StoredObject } from '@/lib/store'

export const SESSION_COOKIE = 'swsh_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function scrypt(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET is not set (needs 32+ characters). Add it in your Vercel environment variables.')
  }
  return value
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

/** Returns the payload when the signature, kind, and expiry all check out. */
export function verifyToken<T extends { exp: number }>(token: string, kind: string): T | null {
  try {
    const [body, signature] = token.split('.')
    if (!body || !signature) return null
    const expected = createHmac('sha256', secret()).update(body).digest('base64url')
    if (!safeEqual(signature, expected)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { kind?: string }
    if (payload.kind !== kind) return null
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, key] = String(stored || '').split('$')
  if (algorithm !== 'scrypt' || !salt || !key) return false
  const derived = await scrypt(password, Buffer.from(salt, 'base64url'), 64)
  const expected = Buffer.from(key, 'base64url')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export interface Customer {
  id: string
  email: string
  name: string
}

export function toCustomer(object: StoredObject): Customer {
  return {
    id: object.id,
    email: String(object.metadata?.email || ''),
    name: String(object.metadata?.name || ''),
  }
}

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function findCustomerByEmail(email: string): Promise<StoredObject | null> {
  return findFirst('customers', { 'metadata.email': email })
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const object = await getById('customers', id)
  return object ? toCustomer(object) : null
}

export function createSessionToken(customerId: string): string {
  return signToken({
    kind: 'session',
    sub: customerId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

/** The signed-in shopper for this request, or null. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken<{ sub: string; exp: number }>(token, 'session')
  if (!payload) return null
  try {
    return await getCustomerById(payload.sub)
  } catch (error) {
    console.error('[auth] customer lookup failed', error)
    return null
  }
}

/** Only allow same-site relative redirects. */
export function safeNext(raw: unknown, fallback = '/account'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}
