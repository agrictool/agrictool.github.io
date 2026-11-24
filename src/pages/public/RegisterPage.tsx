import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser,
  type User, type UserCredential,
} from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { Input, Select, Button, Alert } from '../../components/ui'
import type { Department, AcademicLevel } from '../../types'
import {
  MAX_REGISTRATIONS, INVITE_MESSAGES, cleanCodeInput, isValidCodeFormat, hashCode,
  getLockRemainingMs, recordWrongAttempt, clearAttempts,
} from '../../lib/invite'

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

type RegErrorKind = 'invalid' | 'used' | 'closed' | 'not-ready' | 'email-exists'

class RegistrationError extends Error {
  kind: RegErrorKind
  constructor(kind: RegErrorKind) {
    super(kind)
    this.name = 'RegistrationError'
    this.kind = kind
  }
}

interface FormState {
  invitationCode: string
  gender: string
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
  invitationCode?: string
  gender?: string
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
    invitationCode: '', gender: '',
    fullName: '', email: '', phone: '', department: '',
    academicLevel: '', password: '', confirmPassword: '', consent: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  // 'checking' | 'open' | 'closed' | 'not-ready'
  const [regStatus, setRegStatus] = useState<'checking' | 'open' | 'closed' | 'not-ready'>('checking')
  const busy = useRef(false) // blocks double-clicks / re-submits while a registration is running

  // Show "closed" up-front when all slots are taken (the database rules enforce this regardless)
  useEffect(() => {
    getDoc(doc(db, 'registrationCounter', 'state'))
      .then(snap => {
        if (!snap.exists()) setRegStatus('not-ready')
        else if ((snap.data().count as number) >= MAX_REGISTRATIONS) setRegStatus('closed')
        else setRegStatus('open')
      })
      .catch(() => setRegStatus('open'))
  }, [])

  function setCode(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, invitationCode: cleanCodeInput(e.target.value) }))
    setErrors(er => ({ ...er, invitationCode: undefined }))
  }

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
    if (!form.invitationCode) e.invitationCode = 'An invitation code is required to register.'
    else if (!isValidCodeFormat(form.invitationCode)) e.invitationCode = 'The invitation code has 6 letters.'
    if (!form.gender) e.gender = 'Please select your gender.'
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
    if (busy.current) return
    setServerError('')
    if (!validate()) return

    const lockMs = getLockRemainingMs()
    if (lockMs > 0) {
      setErrors(er => ({
        ...er,
        invitationCode: `Too many incorrect attempts. Please try again in ${Math.ceil(lockMs / 60000)} minute(s).`,
      }))
      return
    }

    busy.current = true
    setSubmitting(true)
    let createdUser: User | null = null
    try {
      const codeHash = await hashCode(form.invitationCode)
      const inviteRef = doc(db, 'inviteCodes', codeHash)
      const counterRef = doc(db, 'registrationCounter', 'state')

      // 1. Check the code first, so no account is created for a bad code
      const [inviteSnap, counterSnap] = await Promise.all([getDoc(inviteRef), getDoc(counterRef)])
      if (!counterSnap.exists()) throw new RegistrationError('not-ready')
      if ((counterSnap.data().count as number) >= MAX_REGISTRATIONS) throw new RegistrationError('closed')
      if (!inviteSnap.exists()) throw new RegistrationError('invalid')
      if (inviteSnap.data().used) throw new RegistrationError('used')

      // 2. Create the login (or resume an earlier attempt that stopped before the profile was saved)
      const email = form.email.trim()
      let user: User
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, form.password)
        user = cred.user
        createdUser = cred.user
      } catch (err) {
        if ((err as { code?: string }).code !== 'auth/email-already-in-use') throw err
        let cred: UserCredential
        try {
          cred = await signInWithEmailAndPassword(auth, email, form.password)
        } catch {
          throw new RegistrationError('email-exists')
        }
        const existing = await getDoc(doc(db, 'users', cred.user.uid))
        if (existing.exists()) throw new RegistrationError('email-exists')
        user = cred.user
      }

      // 3. ONE atomic transaction: consume the code, add 1 to the counter, save the profile.
      //    The database rules re-check every condition, so two people can never share a code
      //    and the 60 limit can never be exceeded.
      const uid = user.uid
      const participantId = generateParticipantId()
      const now = new Date().toISOString()
      await runTransaction(db, async tx => {
        const inv = await tx.get(inviteRef)
        const ctr = await tx.get(counterRef)
        if (!ctr.exists()) throw new RegistrationError('not-ready')
        const count = ctr.data().count as number
        if (count >= MAX_REGISTRATIONS) throw new RegistrationError('closed')
        if (!inv.exists()) throw new RegistrationError('invalid')
        if (inv.data().used) throw new RegistrationError('used')

        tx.update(inviteRef, { used: true, usedAt: now })
        tx.update(counterRef, { count: count + 1 })
        tx.set(doc(db, 'users', uid), {
          uid,
          participantId,
          fullName: form.fullName.trim(),
          email: email.toLowerCase(),
          phone: form.phone.trim() || null,
          gender: form.gender,
          department: form.department,
          academicLevel: form.academicLevel,
          inviteCodeHash: codeHash,
          role: 'participant',
          consentAt: now,
          createdAt: now,
          updatedAt: now,
          accountStatus: 'active',
        })
        tx.set(doc(db, 'participantIds', participantId), { uid, createdAt: serverTimestamp() })
      })

      clearAttempts()
      navigate('/dashboard', { state: { registered: true } })
    } catch (err: unknown) {
      // Registration failed: remove the login we just created so nothing is left half-done
      if (createdUser) { try { await deleteUser(createdUser) } catch { /* ignore */ } }

      if (err instanceof RegistrationError) {
        if (err.kind === 'invalid') {
          recordWrongAttempt()
          setErrors(er => ({ ...er, invitationCode: INVITE_MESSAGES.invalid }))
        } else if (err.kind === 'used') {
          recordWrongAttempt()
          setErrors(er => ({ ...er, invitationCode: INVITE_MESSAGES.used }))
        } else if (err.kind === 'closed') {
          setRegStatus('closed')
        } else if (err.kind === 'not-ready') {
          setRegStatus('not-ready')
        } else {
          setServerError('An account with this email already exists. Please log in.')
        }
      } else {
        const code = (err as { code?: string }).code
        if (code === 'auth/weak-password')
          setServerError('Please choose a stronger password (at least 8 characters).')
        else if (code === 'auth/invalid-email')
          setServerError('Please enter a valid email address.')
        else if (code === 'auth/too-many-requests')
          setServerError('Too many attempts. Please wait a few minutes and try again.')
        else if (code === 'permission-denied' || code === 'aborted' || code === 'failed-precondition')
          setServerError('Registration could not be completed, and your invitation code has not been used. Please check the code and try again.')
        else
          setServerError('Registration failed. Please check your connection and try again.')
      }
    } finally {
      busy.current = false
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

        {regStatus === 'closed' || regStatus === 'not-ready' ? (
          <div className="bg-white border border-[#DDE3E7] rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <Alert variant={regStatus === 'closed' ? 'info' : 'warning'}>
              {regStatus === 'closed' ? INVITE_MESSAGES.closed : INVITE_MESSAGES.notReady}
            </Alert>
            <p className="text-center text-sm text-[#5A6472] mt-5">
              Already registered?{' '}
              <Link to="/login" className="text-[#2E7D32] font-medium hover:underline">Log in</Link>
            </p>
          </div>
        ) : (
        <div className="bg-white border border-[#DDE3E7] rounded-xl shadow-sm p-6 sm:p-8">
          {serverError && (
            <div className="mb-5">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="bg-[#E8F5E9] border border-[#2E7D32]/30 rounded-lg p-4">
              <Input
                id="invitation-code"
                label="Invitation Code (Required)"
                placeholder="e.g. ABCDEF"
                hint="Registration is by invitation only. Enter the 6-letter code you were given."
                value={form.invitationCode}
                onChange={setCode}
                error={errors.invitationCode}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-required="true"
                className="font-mono tracking-[0.3em] uppercase text-center text-lg"
              />
            </div>

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
              id="gender"
              label="Gender (Required)"
              placeholder="Select gender"
              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
              value={form.gender}
              onChange={set('gender')}
              error={errors.gender}
              aria-required="true"
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
        )}
      </div>
    </main>
  )
}
