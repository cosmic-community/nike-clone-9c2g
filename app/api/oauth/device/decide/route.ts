import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/auth'
import { findPendingLogin, hasWrite, normalizeUserCode } from '@/lib/oauth'
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

  if (decision !== 'allow_write' && decision !== 'allow_read') {
    await updateMetadata(login, { status: 'denied', account: customer.id })
    return back('status=denied')
  }

  // Never more than the agent asked for.
  const scope = decision === 'allow_write' && hasWrite(String(login.metadata.scope)) ? 'read write' : 'read'
  await updateMetadata(login, { status: 'approved', account: customer.id, scope })
  return back(`status=allowed&scope=${hasWrite(scope) ? 'write' : 'read'}`)
}
