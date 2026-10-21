import { safeEqual, sha256 } from '@/lib/auth'
import { isExpired, issueTokens, oauthError, readForm } from '@/lib/oauth'
import { findFirst, updateMetadata } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'

export async function POST(request: Request) {
  const form = await readForm(request)
  const grantType = form.get('grant_type') || ''
  const clientId = (form.get('client_id') || '').trim()
  if (!clientId) return oauthError('invalid_client', 'client_id is required.')

  try {
    if (grantType === DEVICE_GRANT) {
      const deviceCode = form.get('device_code') || ''
      if (!deviceCode) return oauthError('invalid_request', 'device_code is required.')

      const login = await findFirst('cap-logins', { 'metadata.device_code_hash': sha256(deviceCode) })
      if (!login || !safeEqual(String(login.metadata.cap_from), clientId)) {
        return oauthError('invalid_grant', 'Unknown or already used device code.')
      }

      const status = String(login.metadata.status)
      if (status === 'denied') return oauthError('access_denied', 'The person denied this request.')
      if (status === 'expired' || ((status === 'pending' || status === 'approved') && isExpired(login))) {
        if (status !== 'expired') await updateMetadata(login, { status: 'expired', device_code_hash: '' })
        return oauthError('expired_token', 'The code expired. Start a new login.')
      }
      if (status === 'pending') return oauthError('authorization_pending', 'Waiting for the person to approve.')
      if (status === 'approved') return issueTokens(login)
      return oauthError('invalid_grant', 'Unknown or already used device code.')
    }

    if (grantType === 'refresh_token') {
      const refreshToken = form.get('refresh_token') || ''
      if (!refreshToken) return oauthError('invalid_request', 'refresh_token is required.')

      const login = await findFirst('cap-logins', { 'metadata.refresh_hash': sha256(refreshToken) })
      if (!login || login.metadata.status !== 'active' || !safeEqual(String(login.metadata.cap_from), clientId)) {
        return oauthError('invalid_grant', 'The refresh token is invalid or revoked.')
      }
      return issueTokens(login)
    }

    return oauthError('unsupported_grant_type', 'Use the device_code or refresh_token grant.')
  } catch (error) {
    console.error('[oauth] token failed', error)
    return oauthError('server_error', 'Could not issue a token. Try again.', 500)
  }
}
