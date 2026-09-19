import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signIn } from '../lib/authClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/'

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await signIn.email({ email, password })
    setSubmitting(false)
    if (err) {
      setError(err.message || 'Could not sign in')
      return
    }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="auth">
      <form className="panel form" onSubmit={onSubmit} noValidate>
        <h1>Sign in</h1>
        <label className={`field ${error ? 'field--error' : ''}`}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className={`field ${error ? 'field--error' : ''}`}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <em className="field__err">{error}</em>}
        </label>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          New to Nimbus?{' '}
          <Link className="link" to={`/sign-up?redirect=${encodeURIComponent(redirect)}`}>
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
