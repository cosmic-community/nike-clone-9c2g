'use client'

import { useEffect, useRef, useState } from 'react'
import Markdown from '@/components/Markdown'
import { parseAgentMessage } from '@/lib/quick-replies'

interface ChatMessage {
  role: 'user' | 'agent'
  text: string
  quickReplies?: string[]
}

const GREETING: ChatMessage = {
  role: 'agent',
  text: "Hey, I'm **Leo**. Ask me anything about our products — sizing, materials, what to pick for your sport.",
  quickReplies: [
    'What should I wear for running?',
    'How do your sizes fit?',
    'What are your shoes made of?',
  ],
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function sendMessage(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || sending) return

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setError(null)
    setSending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
        return
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }

      const replyText = typeof data.reply === 'string' ? data.reply : ''

      if (!replyText.trim()) {
        setError('Leo did not send a reply. Please try again.')
        return
      }

      const { body, quickReplies } = parseAgentMessage(replyText)

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: body,
          ...(quickReplies.length > 0 ? { quickReplies } : {}),
        },
      ])
    } catch {
      setError('Could not reach the chat service. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await sendMessage(input)
  }

  const lastIndex = messages.length - 1

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close chat' : 'Chat with Leo about products'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Leo"
          className="fixed bottom-24 right-6 z-40 flex h-[30rem] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-gray-200 bg-black px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
              L
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold uppercase tracking-wide text-white">Leo</p>
              <p className="text-xs text-gray-400">Product help</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => {
              const isUser = message.role === 'user'
              const showQuickReplies =
                !isUser &&
                index === lastIndex &&
                !sending &&
                (message.quickReplies?.length ?? 0) > 0

              return (
                <div key={index} className="space-y-2">
                  <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        isUser
                          ? 'whitespace-pre-wrap bg-black text-white'
                          : 'bg-gray-100 text-black'
                      }`}
                    >
                      {isUser ? message.text : <Markdown content={message.text} />}
                    </div>
                  </div>

                  {showQuickReplies && (
                    <div className="flex flex-wrap gap-2">
                      {(message.quickReplies ?? []).map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => void sendMessage(label)}
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:border-black hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">
                  Leo is typing…
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-200 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a product…"
              aria-label="Your message"
              maxLength={2000}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-black focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-full bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
