import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'
import { getCurrentCustomer } from '@/lib/auth'
import { findPendingLogin, hasWrite, normalizeUserCode } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connect an AI agent | SWSH.',
  robots: { index: false },
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-6">{title}</h1>
      {children}
    </div>
  )
}

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; status?: string; scope?: string }>
}) {
  const { user_code, status, scope } = await searchParams
  const code = user_code ? normalizeUserCode(user_code) : ''

  if (status === 'allowed') {
    return (
      <Shell title="Agent connected">
        <p className="text-gray-600 mb-6">
          {scope === 'write'
            ? 'The agent can now read your account and orders and change your bag. Every purchase still waits for your OK on this site.'
            : 'The agent can now read your account and orders.'}{' '}
          You can disconnect it any time from your account.
        </p>
        <Link href="/account" className="underline font-semibold">Go to your account</Link>
      </Shell>
    )
  }
  if (status === 'denied') {
    return (
      <Shell title="Request denied">
        <p className="text-gray-600">The agent was not given access. You can close this page.</p>
      </Shell>
    )
  }

  const customer = await getCurrentCustomer()
  if (!customer) {
    return (
      <Shell title="Log in to continue">
        <p className="text-gray-600 mb-6">An AI agent is asking to read your SWSH. account. Log in first.</p>
        <AuthForm next={`/oauth/device${code ? `?user_code=${code}` : ''}`} />
      </Shell>
    )
  }

  if (!code) {
    return (
      <Shell title="Enter your code">
        <form method="GET" className="space-y-4">
          <input
            name="user_code"
            placeholder="ABCD-EFGH"
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg uppercase"
          />
          <button className="w-full py-4 rounded-full bg-black text-white font-bold uppercase tracking-wide">
            Continue
          </button>
        </form>
      </Shell>
    )
  }

  const login = await findPendingLogin(code)
  if (!login || status === 'invalid') {
    return (
      <Shell title="Code not valid">
        <p className="text-gray-600">This code is invalid or expired. Ask the agent to start a new login.</p>
      </Shell>
    )
  }

  const clientName = String(login.metadata.client_name || '') || 'An AI agent'
  const wantsWrite = hasWrite(String(login.metadata.scope))
  const button = 'flex-1 py-4 rounded-full font-bold uppercase tracking-wide'

  return (
    <Shell title="Connect an AI agent">
      <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-3">
        <p>
          <span className="font-bold">{clientName}</span>{' '}
          {wantsWrite
            ? 'wants to read your SWSH. account and order history, and to add and remove items in your bag.'
            : 'wants to read your SWSH. account and order history.'}
        </p>
        <p className="text-sm text-gray-500">
          Agent ID: <span className="font-mono">{String(login.metadata.cap_from)}</span>. The name is provided by
          the agent and is not verified.
        </p>
        <p className="text-sm text-gray-500">
          {wantsWrite
            ? 'It can never pay on its own. Every purchase waits for you to approve it on this site.'
            : 'It cannot place orders, pay, or change anything.'}
        </p>
        <p className="text-sm">
          Only allow this if the agent showed you this code:{' '}
          <span className="font-mono font-bold text-lg">{code}</span>
        </p>
        <p className="text-xs text-gray-400">Signed in as {customer.email}</p>
      </div>
      <form method="POST" action="/api/oauth/device/decide" className="flex flex-col sm:flex-row gap-3">
        <input type="hidden" name="user_code" value={code} />
        {wantsWrite ? (
          <>
            <button name="decision" value="allow_write" className={`${button} bg-black text-white hover:bg-accent`}>
              Allow changes
            </button>
            <button name="decision" value="allow_read" className={`${button} border border-black`}>
              Read only
            </button>
          </>
        ) : (
          <button name="decision" value="allow_read" className={`${button} bg-black text-white hover:bg-accent`}>
            Allow
          </button>
        )}
        <button name="decision" value="deny" className={`${button} border border-gray-300`}>
          Deny
        </button>
      </form>
    </Shell>
  )
}
