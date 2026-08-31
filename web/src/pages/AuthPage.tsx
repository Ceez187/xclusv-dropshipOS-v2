import { useState, type FormEvent } from 'react'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    const { error: authError } =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password)

    setSubmitting(false)

    if (authError) {
      // A raw network failure (Supabase unreachable — paused project, wrong
      // URL, DNS/offline) surfaces here as the browser's own fetch error
      // text ("Load failed" on Safari, "Failed to fetch" on Chromium),
      // which reads as a broken app rather than a connectivity problem.
      setError(
        isAuthRetryableFetchError(authError)
          ? "Can't reach the server right now. Check your connection and try again shortly."
          : authError.message
      )
      return
    }

    if (mode === 'signup') {
      setInfo('Account created. Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 bg-gradient-to-r from-brand-gold-light via-brand-accent to-brand-accent2 bg-clip-text text-xl font-bold text-transparent">
          XCLUSV · DropshipOS
        </h1>
        <p className="mb-6 text-sm text-brand-muted">
          {mode === 'signin' ? 'Sign in to your workspace' : 'Create a new account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
          className="mt-4 w-full text-center text-sm text-brand-gold hover:underline"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </Card>
    </div>
  )
}
