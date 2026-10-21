// Asks Leo through his public CAP door. No agent API token.
const CAP_BASE = (
  process.env.CAP_AGENT_URL || 'https://dapi.cosmicjs.com/cap/v1/ck_4b83e9c84a6af46660f49bc5492b7c9d'
).replace(/\/$/, '')
const CAP_FROM = 'agent:swsh'
const WAIT_BUDGET_MS = 45_000

interface CapReply {
  id?: string
  status?: 'working' | 'done' | 'failed'
  reply?: string
  error?: { code?: string; message?: string }
}

function capHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'CAP-Version': '1.0',
    'CAP-From': CAP_FROM,
  }
}

async function readCap(response: Response): Promise<CapReply> {
  const raw = await response.text()
  let data: CapReply = {}
  try {
    data = raw ? (JSON.parse(raw) as CapReply) : {}
  } catch {
    throw new Error(`CAP reply was not JSON (${response.status})`)
  }
  if (!response.ok && response.status !== 202) {
    throw new Error(data.error?.message || `CAP request failed (${response.status})`)
  }
  return data
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sends one question to Leo and waits until the message is finished.
 * `previousMessageId` is Leo's last message id, so a thread stays on his side.
 */
export async function askAgent(
  message: string,
  previousMessageId?: string
): Promise<{ reply: string; conversationId: string | null }> {
  const payload: Record<string, string> = { message }
  if (previousMessageId) payload.previous_message_id = previousMessageId

  const started = Date.now()
  let response = await fetch(`${CAP_BASE}/messages`, {
    method: 'POST',
    headers: capHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  })
  let capMessage = await readCap(response)

  while (capMessage.status === 'working' && Date.now() - started < WAIT_BUDGET_MS) {
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5_000) : 1_000
    await wait(delay)
    const location = response.headers.get('location')
    const url = location ? new URL(location, response.url).toString() : `${CAP_BASE}/messages/${capMessage.id}`
    response = await fetch(url, {
      headers: { 'CAP-Version': '1.0', 'CAP-From': CAP_FROM },
      signal: AbortSignal.timeout(30_000),
    })
    capMessage = await readCap(response)
  }

  if (capMessage.status === 'done' && capMessage.reply?.trim()) {
    return { reply: capMessage.reply.trim(), conversationId: capMessage.id || previousMessageId || null }
  }
  if (capMessage.status === 'failed') {
    throw new Error(capMessage.error?.message || 'Leo could not answer')
  }
  throw new Error('Leo did not finish in time')
}
