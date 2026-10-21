import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/auth'
import { findPendingLogin, normalizeUserCode } from '@/lib/oauth'
import { updateMetadata } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const form = await request.formData()
  const code = normalizeUserCode(String(form.get('user_code') || ''))
  const decision = String(form.get('decision') || '')
  const back = (query: string) => NextResponse.redirect(new URL(`/oauth/device?${query}`, request.url), 303)

  const customer = await getCurrentCustomer()
  if (!customer) return back(`user_code=${encodeURIComponent(code)}`)

  const login = await findPendingLogin(code)
  if (!login) return back('status=invalid&user_code=x')

  const allowed = decision === 'allow'
  await updateMetadata(login, { status: allowed ? 'approved' : 'denied', account: customer.id })
  return back(`status=${allowed ? 'allowed' : 'denied'}`)
}
