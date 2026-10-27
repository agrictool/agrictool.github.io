import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { Input, Select, Button, Alert } from '../../components/ui'
import type { Department, AcademicLevel } from '../../types'

const DEPARTMENTS: Department[] = [
  'Agricultural & Resource Economics',
  'Agricultural Extension & Communication Technology',
  'Animal Production & Health',
  'Crop, Soil & Pest Management',
  'Fisheries & Aquaculture Technology',
  'Food Science & Technology',
  'Forestry & Wood Technology',
  'Eco-Tourism & Wildlife Management',
]

const LEVELS: AcademicLevel[] = ['100L', '200L', '300L', '400L', '500L']

function generateParticipantId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  arr.forEach(b => { suffix += chars[b % chars.length] })
  return `FUTA-DFS-${suffix}`
}

interface FormState {
  fullName: string
  email: string
  phone: string
  department: string
  academicLevel: string
  password: string
  confirmPassword: string
  consent: boolean
}

interface FormErrors {
  fullName?: string
  email?: string
  department?: string
  academicLevel?: string
  password?: string
  confirmPassword?: string
  consent?: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    fullName: '', email: '', phone: '', department: '',
    academicLevel: '', password: '', confirmPassword: '', consent: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      setForm(f => ({ ...f, [field]: val }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required.'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'A valid email address is required.'
    if (!form.department) e.department = 'Please select your department.'
    if (!form.academicLevel) e.academicLevel = 'Please select your level.'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    if (!form.consent) e.consent = 'You must agree to the privacy notice to register.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      const uid = cred.user.uid
      // Spark fallback: generate participant ID client-side and reserve it
      const participantId = generateParticipantId()
      const now = new Date().toISOString()
      await setDoc(doc(db, 'users', uid), {
        uid,
        participantId,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        department: form.department,
        academicLevel: form.academicLevel,
        role: 'participant',
        consentAt: now,
        createdAt: now,
        updatedAt: now,
        accountStatus: 'active',
      })
      // Reserve the participant ID (Spark fallback, see ARCHITECTURE.md)
      await setDoc(doc(db, 'participantIds', participantId), { uid, createdAt: serverTimestamp() })
      navigate('/dashboard', { state: { registered: true } })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use')
        setServerError('An account with this email already exists. Please log in.')
      else if (code === 'auth/weak-password')
        setServerError('Please choose a stronger password (at least 8 characters).')
      else
        setServerError('Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FBF9] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#12304A] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-[#D4AF37] font-bold text-lg">R</span>
          </div>
          <h1 className="text-2xl font-bold text-[#12304A]">Create Participant Account</h1>
          <p className="text-sm text-[#5A6472] mt-1">
            RAISSAT Digital Food Systems Project · FUTA
          </p>
        </div>

        <div className="bg-white border border-[#DDE3E7] rounded-xl shadow-sm p-6 sm:p-8">
          {serverError && (
            <div className="mb-5">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Full Name"
              required
              placeholder="As it appears on your student ID"
              value={form.fullName}
              onChange={set('fullName')}
              error={errors.fullName}
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="your.email@student.futa.edu.ng"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="Optional"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
            />

            <Select
              label="Academic Department"
              required
              placeholder="Select your department"
              options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
              value={form.department}
              onChange={set('department')}
              error={errors.department}
            />

            <Select
              label="Current Level of Study"
              required
              placeholder="Select your level"
              options={LEVELS.map(l => ({ value: l, label: l }))}
              value={form.academicLevel}
              onChange={set('academicLevel')}
              error={errors.academicLevel}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                required
                hint="Minimum 8 characters"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                type="password"
                required
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
            </div>

            {/* Consent */}
            <div className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={set('consent')}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#2E7D32] focus:ring-[#2E7D32]"
                  aria-required="true"
                />
                <span className="text-sm text-[#374151]">
                  I have read and agree to the{' '}
                  <Link to="/privacy" target="_blank" className="text-[#2E7D32] underline">
                    Privacy Notice
                  </Link>
                  . I consent to my registration data and assessment responses being used for
                  the purposes of the RAISSAT Digital Food Systems Project evaluation.
                </span>
              </label>
              {errors.consent && (
                <p className="text-xs text-[#C62828] mt-2" role="alert">{errors.consent}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              {submitting ? 'Creating Account…' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-[#5A6472] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2E7D32] font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
