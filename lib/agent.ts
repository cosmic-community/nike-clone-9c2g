// Server-only helper that asks the store's Cosmic agent a question.
const AGENT_ID = process.env.COSMIC_AGENT_ID || '6aa0bf3ca2574094a7d34fed'
const AGENT_ENDPOINT = `https://dapi.cosmicjs.com/v3/ai/agents/${AGENT_ID}/messages`

function pickString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
    if (value && typeof value === 'object') {
      const nested = (value as Record<string, unknown>).content ?? (value as Record<string, unknown>).text
      if (typeof nested === 'string' && nested.trim()) return nested
    }
  }
  return null
}

export async function askAgent(
  message: string,
  conversationId?: string
): Promise<{ reply: string; conversationId: string | null }> {
  const token = process.env.COSMIC_AGENT_TOKEN
  if (!token) throw new Error('COSMIC_AGENT_TOKEN is not set')

  const payload: Record<string, unknown> = { message }
  if (conversationId) payload.conversation_id = conversationId

  const upstream = await fetch(AGENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  })

  const raw = await upstream.text()
  if (!upstream.ok) throw new Error(`agent request failed (${upstream.status}): ${raw.slice(0, 300)}`)

  let parsed: unknown = raw
  try {
    parsed = JSON.parse(raw)
  } catch {
    // plain text reply
  }

  if (typeof parsed === 'string') return { reply: parsed, conversationId: conversationId ?? null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (parsed ?? {}) as Record<string, any>
  const reply = pickString([
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
  ])
  if (!reply) throw new Error(`agent reply missing: ${raw.slice(0, 300)}`)

  const nextConversation = pickString([
    data.conversation_id,
    data.conversationId,
    data.thread_id,
    data.data?.conversation_id,
    data.data?.conversationId,
  ])

  return { reply, conversationId: nextConversation ?? conversationId ?? null }
}
