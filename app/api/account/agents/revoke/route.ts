import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/auth'
import { getById, updateMetadata } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const customer = await getCurrentCustomer()
  const form = await request.formData()
  const loginId = String(form.get('login_id') || '')

  if (customer) {
    const login = await getById('cap-logins', loginId)
    if (login && login.metadata.account === customer.id) {
      await updateMetadata(login, { status: 'revoked', refresh_hash: '' })
    }
  }

  return NextResponse.redirect(new URL('/account', request.url), 303)
}
