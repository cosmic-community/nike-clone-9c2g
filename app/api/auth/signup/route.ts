import { NextResponse } from 'next/server'
import {
  createSessionToken,
  findCustomerByEmail,
  hashPassword,
  normalizeEmail,
  sessionCookie,
} from '@/lib/auth'
import { insertObject } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown; password?: unknown }
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (await findCustomerByEmail(email)) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }

    const customer = await insertObject('customers', name || email, {
      email,
      name,
      password_hash: await hashPassword(password),
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(sessionCookie(createSessionToken(customer.id)))
    return response
  } catch (error) {
    console.error('[auth] signup failed', error)
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }
}
