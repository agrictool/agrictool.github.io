import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { Input, Button, Alert } from '../../components/ui'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch {
      // Don't reveal whether the email exists
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FBF9] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#12304A]">Reset Password</h1>
          <p className="text-sm text-[#5A6472] mt-1">We'll send a reset link to your email.</p>
        </div>

        <div className="bg-white border border-[#DDE3E7] rounded-xl shadow-sm p-6 sm:p-8">
          {sent ? (
            <Alert variant="success" title="Reset email sent">
              If an account exists for that email, a password reset link has been sent. Check your inbox.
              <div className="mt-3">
                <Link to="/login" className="text-sm text-[#2E7D32] font-medium hover:underline">
                  Return to Log In
                </Link>
              </div>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                error={error}
                autoComplete="email"
              />
              <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-[#5A6472]">
                <Link to="/login" className="text-[#2E7D32] hover:underline">Back to Log In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
