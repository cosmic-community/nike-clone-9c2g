import { NextResponse } from 'next/server'
import { randomToken, sha256 } from '@/lib/auth'
import { DEVICE_TTL, makeUserCode, oauthError, readForm, siteOrigin } from '@/lib/oauth'
import { insertObject } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const form = await readForm(request)
  const clientId = (form.get('client_id') || '').trim()
  if (!/^agent:\S{1,200}$/.test(clientId)) {
    return oauthError('invalid_client', 'client_id must be your CAP-From, e.g. agent:example-assistant.')
  }

  const requested = (form.get('scope') || 'read').trim().split(/\s+/).filter(Boolean)
  if (requested.some((scope) => scope !== 'read')) {
    return oauthError('invalid_scope', 'This store offers read access only.')
  }

  const clientName = (form.get('client_name') || '').trim().slice(0, 80)
  const deviceCode = randomToken(32)
  const userCode = makeUserCode()

  try {
    await insertObject('cap-logins', `${clientName || clientId} · ${userCode}`, {
      cap_from: clientId,
      client_name: clientName,
      account: '',
      scope: 'read',
      status: 'pending',
      user_code: userCode,
      device_code_hash: sha256(deviceCode),
      refresh_hash: '',
      expires_at: new Date(Date.now() + DEVICE_TTL * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[oauth] device authorization failed', error)
    return oauthError('server_error', 'Could not start the login. Try again.', 500)
  }

  const origin = siteOrigin(request)
  return NextResponse.json(
    {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${origin}/oauth/device`,
      verification_uri_complete: `${origin}/oauth/device?user_code=${encodeURIComponent(userCode)}`,
      expires_in: DEVICE_TTL,
      interval: 5,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
