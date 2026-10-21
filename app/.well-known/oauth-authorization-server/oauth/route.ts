import { NextResponse } from 'next/server'
import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

// RFC 8414 metadata for the issuer listed on the OAuth line of /agent.txt.
export function GET(request: Request) {
  const origin = siteOrigin(request)
  return NextResponse.json({
    issuer: `${origin}/oauth`,
    device_authorization_endpoint: `${origin}/oauth/device_authorization`,
    token_endpoint: `${origin}/oauth/token`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    grant_types_supported: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['read'],
  })
}
