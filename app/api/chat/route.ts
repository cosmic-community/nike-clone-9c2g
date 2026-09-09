import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGENT_ID =
  process.env.COSMIC_AGENT_ID || '6aa0bf3ca2574094a7d34fed'

const AGENT_ENDPOINT = `https://dapi.cosmicjs.com/v3/ai/agents/${AGENT_ID}/messages`

/**
 * The agent messaging API returns a reply, but the exact field name is not
 * pinned down in the public docs yet. Rather than guess a single key and show
 * an empty bubble when it is wrong, check the plausible shapes in order and
 * surface the raw payload for debugging if none match.
 */
function extractReply(payload: unknown): string | null {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, any>

  const candidates = [
    data.reply,
    data.message,
    data.content,
    data.text,
    data.response,
    data.output,
    data.data?.reply,
    data.data?.message,
    data.data?.content,
    data.choices?.[0]?.message?.content,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
    // Some APIs nest the text one level deeper, e.g. { message: { content } }
    if (candidate && typeof candidate === 'object') {
      const nested = (candidate as Record<string, any>).content ?? (candidate as Record<string, any>).text
      if (typeof nested === 'string' && nested.trim()) {
        return nested
      }
    }
  }

  return null
}

function extractConversationId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as Record<string, any>
  const candidates = [
    data.conversation_id,
    data.conversationId,
    data.thread_id,
    data.data?.conversation_id,
    data.data?.conversationId,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return null
}

export async function POST(request: NextRequest) {
  const token = process.env.COSMIC_AGENT_TOKEN

  if (!token) {
    console.error('[chat] COSMIC_AGENT_TOKEN is not set')
    return NextResponse.json(
      { error: 'Chat is not configured yet. Missing COSMIC_AGENT_TOKEN.' },
      { status: 500 }
    )
  }

  let body: { message?: unknown; conversation_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const conversationId =
    typeof body.conversation_id === 'string' && body.conversation_id.trim()
      ? body.conversation_id.trim()
      : undefined

  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: 'Message is too long. Please keep it under 2000 characters.' },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = { message }
  if (conversationId) {
    payload.conversation_id = conversationId
  }

  try {
    const upstream = await fetch(AGENT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const raw = await upstream.text()

    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Leave as the raw string; extractReply handles plain text.
    }

    if (!upstream.ok) {
      console.error('[chat] agent request failed', upstream.status, raw.slice(0, 500))
      const detail =
        upstream.status === 401 || upstream.status === 403
          ? 'The chat service rejected the credentials.'
          : 'The chat service is unavailable right now.'
      return NextResponse.json({ error: detail }, { status: 502 })
    }

    const reply = extractReply(parsed)

    if (!reply) {
      console.error('[chat] could not find reply text in payload', raw.slice(0, 1000))
      return NextResponse.json(
        { error: 'Got a response but could not read it. This has been logged.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      reply,
      conversation_id: extractConversationId(parsed) ?? conversationId ?? null,
    })
  } catch (error) {
    console.error('[chat] unexpected error', error)
    return NextResponse.json(
      { error: 'Something went wrong reaching the chat service.' },
      { status: 500 }
    )
  }
}
