import { capHelp } from '@/lib/cap'
import { siteOrigin } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return new Response(capHelp(siteOrigin(request)), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
