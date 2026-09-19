import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signUp } from '../lib/authClient'

export default function SignUp() {
  const [name, setName] = useState('')
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
    const { error: err } = await signUp.email({ name, email, password })
    setSubmitting(false)
    if (err) {
      setError(err.message || 'Could not create an account')
      return
    }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="auth">
      <form className="panel form" onSubmit={onSubmit} noValidate>
        <h1>Create an account</h1>
        <label className="field">
          <span>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            required
          />
          {error && <em className="field__err">{error}</em>}
        </label>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted">
          Already have an account?{' '}
          <Link className="link" to={`/sign-in?redirect=${encodeURIComponent(redirect)}`}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
