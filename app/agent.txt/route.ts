import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

// CAP front door: https://conciergeprotocol.org/spec#front-door
export function GET(request: Request) {
  const origin = siteOrigin(request)
  const body = [
    'Protocol: CAP/1.0',
    'Name: Leo',
    `Chat: ${origin}/`,
    `CAP: https://dapi.cosmicjs.com/cap/v1/ck_4b83e9c84a6af46660f49bc5492b7c9d`,
    `OAuth: ${origin}/oauth`,
    'Spec: https://conciergeprotocol.org/cap.txt',
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  })
}
