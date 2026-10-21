import { NextResponse } from 'next/server'
import { authenticateCap, capError, toPublic, type CapMessageData } from '@/lib/cap'
import { findFirst } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await authenticateCap(request)
  if (caller instanceof NextResponse) return caller

  const { id } = await params
  const stored = await findFirst('cap-messages', { 'metadata.message_id': id })
  // Visible only to the same CAP-From with the same grant (or none).
  if (
    !stored ||
    stored.metadata.cap_from !== caller.capFrom ||
    (stored.metadata.account || '') !== (caller.account || '')
  ) {
    return capError('not_found', 'That message was not found.', 404)
  }

  return NextResponse.json(toPublic(stored.metadata.data as CapMessageData))
}
