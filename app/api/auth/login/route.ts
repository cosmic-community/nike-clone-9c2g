import { NextResponse } from 'next/server'
import {
  createSessionToken,
  findCustomerByEmail,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown }
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    const customer = email ? await findCustomerByEmail(email) : null
    const ok = customer ? await verifyPassword(password, String(customer.metadata.password_hash || '')) : false
    if (!customer || !ok) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(sessionCookie(createSessionToken(customer.id)))
    return response
  } catch (error) {
    console.error('[auth] login failed', error)
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 })
  }
}
