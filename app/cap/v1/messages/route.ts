import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { sha256 } from '@/lib/auth'
import { authenticateCap, capError, toPublic, type CapMessageData } from '@/lib/cap'
import { answerCap } from '@/lib/concierge'
import { findFirst, insertObject } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_TURNS = 30
// Questions that clearly need the shopper's account. Without a grant they fail with login_required.
const ACCOUNT_HINT =
  /\b(my|mine)\b[\s\S]{0,40}\b(orders?|account|purchases?|shipments?|deliver(y|ies)|returns?|refunds?)\b|\border status\b/i

export async function POST(request: Request) {
  const caller = await authenticateCap(request)
  if (caller instanceof NextResponse) return caller

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return capError('invalid_request', 'The body must be JSON.', 400)
  }

  const text = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!text) return capError('invalid_request', 'message is required.', 400)
  if (text.length > 4000) return capError('invalid_request', 'message is too long.', 400)

  const hasContext = body.context && typeof body.context === 'object' && !Array.isArray(body.context)
  if (hasContext && JSON.stringify(body.context).length > 2000) {
    return capError('invalid_request', 'context is too large. Send a short brief.', 400)
  }

  try {
    const idempotencyKey = (request.headers.get('idempotency-key') || '').trim()
    const scopedKey = idempotencyKey ? sha256(`${caller.capFrom}|${caller.account ?? ''}|${idempotencyKey}`) : ''
    if (scopedKey) {
      const existing = await findFirst('cap-messages', { 'metadata.idempotency_key': scopedKey })
      if (existing) return NextResponse.json(toPublic(existing.metadata.data as CapMessageData))
    }

    let turn = 1
    if (body.previous_message_id !== undefined) {
      const previousId = body.previous_message_id
      if (typeof previousId !== 'string' || !previousId) {
        return capError('invalid_request', 'previous_message_id must be a message id.', 400)
      }
      const previous = await findFirst('cap-messages', { 'metadata.message_id': previousId })
      const visible =
        previous &&
        previous.metadata.cap_from === caller.capFrom &&
        // a thread may gain a grant, never switch accounts or drop one
        (!previous.metadata.account || previous.metadata.account === caller.account)
      if (!previous || !visible) return capError('not_found', 'That earlier message was not found.', 404)

      const previousData = previous.metadata.data as CapMessageData
      if (previousData.status === 'working') {
        return capError('conflict', 'The earlier message is still being answered.', 409)
      }
      turn = (previousData.turn ?? 1) + 1
      if (turn > MAX_TURNS) return capError('conflict', 'This conversation is too long. Start a new one.', 409)
    }

    const data: CapMessageData = {
      id: `msg_${randomBytes(8).toString('hex')}`,
      status: 'working',
      created_at: new Date().toISOString(),
      turn,
    }

    if (!caller.account && ACCOUNT_HINT.test(text)) {
      data.status = 'failed'
      data.error = {
        code: 'login_required',
        message: 'This needs your store account. Log in so I can look up your orders.',
      }
    } else {
      try {
        data.reply = await answerCap(text, caller.account, new URL(request.url).origin)
        data.status = 'done'
      } catch (error) {
        console.error('[cap] answer failed', error)
        data.status = 'failed'
        data.error = { code: 'unavailable', message: 'The store assistant could not answer right now. Try again shortly.' }
      }
    }
    data.finished_at = new Date().toISOString()

    try {
      await insertObject('cap-messages', `${caller.capFrom} · ${data.id}`, {
        message_id: data.id,
        cap_from: caller.capFrom,
        account: caller.account ?? '',
        idempotency_key: scopedKey,
        data,
      })
    } catch (error) {
      console.error('[cap] could not store message', error)
    }

    return NextResponse.json(toPublic(data))
  } catch (error) {
    console.error('[cap] unexpected error', error)
    return capError('unavailable', 'The store assistant is not answering right now.', 503)
  }
}
