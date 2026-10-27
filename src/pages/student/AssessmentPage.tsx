import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { PRE_SCHEMA, POST_SCHEMA } from '../../lib/questionnaireSchemas'
import FormEngine from '../../components/survey/FormEngine'
import { Button, Alert, Spinner } from '../../components/ui'
import { CheckCircle2, ChevronLeft, Send, Eye } from 'lucide-react'
import type { QuestionnaireSchema } from '../../types'

const DRAFT_KEY = (uid: string, type: 'pre' | 'post') => `raissat_draft_${uid}_${type}`

function getSchema(type: 'pre' | 'post'): QuestionnaireSchema {
  return type === 'pre' ? PRE_SCHEMA : POST_SCHEMA
}

function validateRequired(schema: QuestionnaireSchema, answers: Record<string, unknown>): string[] {
  const missing: string[] = []
  for (const q of schema.questions) {
    if (!q.required || q.type === 'readonly') continue
    const val = answers[q.id]
    if (q.type === 'single-select') {
      if (!val || typeof val !== 'string') missing.push(q.id)
    } else if (q.type === 'multi-select') {
      if (!Array.isArray(val) || val.length === 0) missing.push(q.id)
    } else if (q.type === 'matrix') {
      const matrixVal = val as Record<string, string> | undefined
      const allAnswered = q.matrixRows?.every(r => matrixVal?.[r.id])
      if (!allAnswered) missing.push(q.id)
    }
  }
  return missing
}

type Step = 'form' | 'review' | 'submitted'

export default function AssessmentPage() {
  const { type } = useParams<{ type: 'pre' | 'post' }>()
  const surveyType = (type === 'post' ? 'post' : 'pre') as 'pre' | 'post'
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { settings } = useSettings()
  const schema = getSchema(surveyType)

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [step, setStep] = useState<Step>('form')
  const [missingIds, setMissingIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  const phaseState = surveyType === 'pre' ? settings.preSurveyState : settings.postSurveyState

  // Prefill readonly fields
  useEffect(() => {
    if (!profile) return
    const prefilled: Record<string, unknown> = {}
    for (const q of schema.questions) {
      if (q.type === 'readonly' && q.prefillFrom) {
        prefilled[q.id] = profile[q.prefillFrom] ?? ''
      }
    }
    setAnswers(prev => ({ ...prefilled, ...prev }))
  }, [profile, schema])

  // Check if already submitted + load draft
  useEffect(() => {
    if (!profile) return
    async function checkSubmission() {
      const docId = `${profile!.uid}_${surveyType}`
      const snap = await getDoc(doc(db, 'surveyResponses', docId))
      if (snap.exists()) {
        setAlreadySubmitted(true)
        setStep('submitted')
        setLoading(false)
        return
      }
      // Load draft
      const draftRaw = localStorage.getItem(DRAFT_KEY(profile!.uid, surveyType))
      if (draftRaw) {
        try {
          const parsed = JSON.parse(draftRaw)
          setAnswers(prev => ({ ...prev, ...parsed }))
        } catch { /* ignore corrupt draft */ }
      }
      setLoading(false)
    }
    checkSubmission()
  }, [profile, surveyType])

  // Save draft on change
  useEffect(() => {
    if (!profile || loading) return
    localStorage.setItem(DRAFT_KEY(profile.uid, surveyType), JSON.stringify(answers))
  }, [answers, profile, surveyType, loading])

  const handleChange = (id: string, val: unknown) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setMissingIds(prev => prev.filter(m => m !== id))
  }

  const handleReview = () => {
    const missing = validateRequired(schema, answers)
    if (missing.length > 0) {
      setMissingIds(missing)
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setStep('review')
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!profile) return
    setSubmitting(true)
    setError('')
    try {
      const docId = `${profile.uid}_${surveyType}`
      await setDoc(doc(db, 'surveyResponses', docId), {
        participantId: profile.participantId,
        userId: profile.uid,
        surveyType,
        answers,
        schemaVersion: schema.schemaVersion,
        submittedAt: new Date().toISOString(),
        completionStatus: 'submitted',
      })
      // Clear draft
      localStorage.removeItem(DRAFT_KEY(profile.uid, surveyType))
      setStep('submitted')
    } catch (e: unknown) {
      const msg = (e as { code?: string }).code
      if (msg === 'permission-denied') {
        if (phaseState !== 'open') {
          setError('This assessment phase is now closed. Your responses could not be saved.')
        } else {
          setError('You have already submitted this assessment.')
        }
      } else {
        setError('Submission failed. Please check your connection and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const phaseLabel = surveyType === 'pre' ? 'Pre-Training' : 'Post-Training'

  if (!profile) return <Spinner label="Loading…" />

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Spinner label="Loading assessment…" />
    </div>
  )

  // Phase not open
  if (phaseState !== 'open' && step !== 'submitted' && !alreadySubmitted) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Alert variant="info" title={`${phaseLabel} Assessment — ${phaseState === 'not_open' ? 'Not Yet Open' : 'Closed'}`}>
          {phaseState === 'not_open'
            ? 'This assessment is not currently open. Please check back when the project administrator makes it available.'
            : 'This assessment has closed. If you believe this is an error, please contact the project administrator.'}
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
      </main>
    )
  }

  // Already submitted
  if (step === 'submitted') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-[#DDE3E7] rounded-xl p-8 shadow-sm">
          <CheckCircle2 className="w-14 h-14 text-[#2E7D32] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#12304A] mb-2">
            {alreadySubmitted ? 'Assessment Already Submitted' : 'Submission Successful!'}
          </h1>
          <p className="text-[#5A6472] mb-1">
            Your {phaseLabel.toLowerCase()} assessment has been recorded.
          </p>
          <p className="text-sm text-[#5A6472] mb-6">
            Participant ID: <strong className="font-mono text-[#12304A]">{profile.participantId}</strong>
          </p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8" ref={topRef}>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => step === 'review' ? setStep('form') : navigate('/dashboard')}
          className="text-sm text-[#2E7D32] hover:underline flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 'review' ? 'Back to Edit' : 'Back to Dashboard'}
        </button>
        <div className="bg-[#12304A] text-white rounded-xl p-5">
          <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest mb-1">
            {phaseLabel} Assessment
          </p>
          <h1 className="text-lg font-bold leading-snug mb-1">{schema.title}</h1>
          <p className="text-sm text-blue-200">{schema.subtitle}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-blue-300">
            <span>~{schema.estimatedMinutes} minutes</span>
            <span>·</span>
            <span>Participant: {profile.participantId}</span>
          </div>
        </div>
      </div>

      {/* Missing fields alert */}
      {missingIds.length > 0 && (
        <div className="mb-6">
          <Alert variant="error" title="Please answer all required questions">
            {missingIds.length} required question{missingIds.length > 1 ? 's' : ''} still need{missingIds.length === 1 ? 's' : ''} an answer.
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Review mode banner */}
      {step === 'review' && (
        <div className="mb-6">
          <Alert variant="info" title="Review your answers">
            Please review your responses below before submitting. Once submitted, you cannot make changes
            unless an administrator reopens this assessment.
          </Alert>
        </div>
      )}

      {/* Form */}
      <div className={`bg-white border border-[#DDE3E7] rounded-xl p-6 sm:p-8 ${step === 'review' ? 'opacity-90' : ''}`}>
        <FormEngine
          schema={schema}
          answers={answers}
          onChange={handleChange}
          profile={profile}
          readonly={step === 'review'}
        />
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
        {step === 'form' && (
          <Button variant="primary" size="lg" onClick={handleReview}>
            <Eye className="w-4 h-4" /> Review Before Submitting
          </Button>
        )}
        {step === 'review' && (
          <>
            <Button variant="outline" size="lg" onClick={() => setStep('form')}>
              <ChevronLeft className="w-4 h-4" /> Edit Answers
            </Button>
            <Button variant="primary" size="lg" loading={submitting} onClick={handleSubmit}>
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Confirm & Submit'}
            </Button>
          </>
        )}
      </div>

      {/* Draft notice */}
      {step === 'form' && (
        <p className="text-xs text-[#5A6472] text-center mt-4">
          Your answers are saved automatically as a draft in this browser.
        </p>
      )}
    </main>
  )
}
