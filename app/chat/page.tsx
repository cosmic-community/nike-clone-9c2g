import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat | SWSH.',
  description: 'Chat with our assistant about products, sizing, orders, and returns.',
}

export default function ChatPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Chat</h1>
      <p className="text-gray-600 mb-8">
        Ask us anything about products, sizing, orders, or returns.
      </p>

      <div id="chat" style={{ height: '70vh' }} />

      {/*
        Must be a plain <script> rendered into the server HTML, NOT next/script.
        agent.js reads its own data-* attributes from document.currentScript,
        which is null for dynamically-injected scripts (what next/script does).
      */}
      <script
        src="https://www.cosmicjs.com/agent.js"
        data-key="pk_03b207342c93ec8e8431244e4f108548"
        data-target="#chat"
        async
      />
    </div>
  )
}
