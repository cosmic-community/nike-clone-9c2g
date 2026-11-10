import { NextResponse } from 'next/server'
import { authenticateCap, capError } from '@/lib/cap'
import { findConfirmation, publicConfirmation } from '@/lib/confirmations'
import { siteOrigin } from '@/lib/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RETRY_AFTER_SECONDS = 3

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await authenticateCap(request)
  if (caller instanceof NextResponse) return caller
  if (!caller.account) return capError('login_required', 'Send the login this confirmation was made with.', 401)

  const { id } = await params
  const confirmation = await findConfirmation(id)
  // Visible only to the agent and account that asked for it.
  if (
    !confirmation ||
    confirmation.metadata.cap_from !== caller.capFrom ||
    confirmation.metadata.account !== caller.account
  ) {
    return capError('not_found', 'That confirmation was not found.', 404)
  }

  const body = publicConfirmation(confirmation, siteOrigin(request))
  const waiting = body.status === 'pending' || body.status === 'working'
  return NextResponse.json(body, waiting ? { headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) } } : undefined)
}
