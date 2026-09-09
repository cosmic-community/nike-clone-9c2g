const QUICK_REPLY_RE = /\[QUICK_REPLY:\s*([^\]]+)\]/g

export interface ParsedAgentMessage {
  /** Message body with all [QUICK_REPLY: ...] tokens removed. */
  body: string
  /** Suggested replies, in the order the agent listed them. */
  quickReplies: string[]
}

/**
 * Pulls [QUICK_REPLY: ...] tokens out of an agent reply so they can be
 * rendered as buttons instead of leaking into the message text.
 */
export function parseAgentMessage(raw: string): ParsedAgentMessage {
  const quickReplies: string[] = []
  let match: RegExpExecArray | null

  QUICK_REPLY_RE.lastIndex = 0

  while ((match = QUICK_REPLY_RE.exec(raw)) !== null) {
    const label = (match[1] ?? '').trim()
    if (label && !quickReplies.includes(label)) {
      quickReplies.push(label)
    }
  }

  const body = raw
    .replace(QUICK_REPLY_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { body, quickReplies }
}
