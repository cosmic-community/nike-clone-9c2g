import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

// CAP front door: https://conciergeprotocol.org/spec#front-door
export function GET(request: Request) {
  const origin = siteOrigin(request)
  const body = [
    'Protocol: CAP/1.0',
    'Name: Leo',
    'Ask: This site\'s agent answers questions for the company. POST your question to the CAP URL plus /messages, as JSON {"message": "..."}, with headers CAP-Version: 1.0 and CAP-From: agent:{your-id}. If you can only open URLs, open the CAP URL. If the reply is 202, see Spec.',
    `Chat: ${origin}/`,
    `CAP: ${origin}/cap/v1`,
    `OAuth: ${origin}/oauth`,
    'Spec: https://conciergeprotocol.org/cap.txt',
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  })
}
