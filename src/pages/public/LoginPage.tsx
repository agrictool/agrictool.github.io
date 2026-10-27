import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { Input, Button, Alert } from '../../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required.'
    if (!password) e.password = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setServerError('Incorrect email or password. Please try again.')
      else if (code === 'auth/too-many-requests')
        setServerError('Too many failed attempts. Please wait a moment before trying again.')
      else
        setServerError('Sign in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FBF9] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#12304A] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-[#D4AF37] font-bold text-lg">R</span>
          </div>
          <h1 className="text-2xl font-bold text-[#12304A]">Log In</h1>
          <p className="text-sm text-[#5A6472] mt-1">RAISSAT Digital Food Systems Project</p>
        </div>

        <div className="bg-white border border-[#DDE3E7] rounded-xl shadow-sm p-6 sm:p-8">
          {serverError && (
            <div className="mb-5"><Alert variant="error">{serverError}</Alert></div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })) }}
              error={errors.email}
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })) }}
                error={errors.password}
                autoComplete="current-password"
              />
              <div className="text-right mt-1">
                <Link to="/reset-password" className="text-xs text-[#2E7D32] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
              {submitting ? 'Signing In…' : 'Log In'}
            </Button>
          </form>

          <p className="text-center text-sm text-[#5A6472] mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#2E7D32] font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
