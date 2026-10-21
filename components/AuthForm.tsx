'use client'

import { useState, type FormEvent } from 'react'

export default function AuthForm({ next = '/account' }: { next?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      window.location.href = next.startsWith('/') && !next.startsWith('//') ? next : '/account'
    } catch {
      setError('Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  const input = 'w-full border border-gray-300 rounded-lg px-4 py-3'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      )}
      <input
        className={input}
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        className={input}
        type="password"
        placeholder="Password (8+ characters)"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full py-4 rounded-full bg-black text-white font-bold uppercase tracking-wide hover:bg-accent transition-colors disabled:opacity-60"
      >
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-sm text-gray-600 text-center">
        {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
        <button
          type="button"
          className="underline font-semibold"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </form>
  )
}
