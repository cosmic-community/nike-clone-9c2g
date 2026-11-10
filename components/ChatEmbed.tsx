'use client'

import { useEffect, useRef } from 'react'

// agent.js boots once per <script> element. A <script> rendered by React only runs on a full
// page load, so client-side navigation back to this page left the container empty. Adding a
// fresh script element on every mount boots the chat each visit.
export default function ChatEmbed({ agentKey }: { agentKey: string }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = container.current
    if (!target) return
    const script = document.createElement('script')
    script.src = 'https://www.cosmicjs.com/agent.js'
    script.async = true
    script.dataset.key = agentKey
    script.dataset.target = '#chat'
    script.dataset.theme = 'light'
    document.body.appendChild(script)
    return () => {
      script.remove()
      target.querySelectorAll('[data-cosmic-embed]').forEach((node) => node.remove())
    }
  }, [agentKey])

  return <div id="chat" ref={container} style={{ height: '70vh' }} />
}
