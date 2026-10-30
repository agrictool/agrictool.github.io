import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Card, Badge, Alert, Spinner, PhaseStatusBadge, ButtonLink } from '../../components/ui'
import { ClipboardList, CheckCircle2, Award, Lock, ChevronRight, Info } from 'lucide-react'

interface CompletionStatus {
  preSubmitted: boolean
  postSubmitted: boolean
  certificateIssued: boolean
}

function PhaseCard({
  number, title, icon: Icon, state, completed, locked, actionPath, actionLabel, children,
}: {
  number: string
  title: string
  icon: React.ElementType
  state: 'not_open' | 'open' | 'closed'
  completed: boolean
  locked: boolean
  actionPath?: string
  actionLabel?: string
  children?: React.ReactNode
}) {
  const borderColor = completed
    ? 'border-[#2E7D32]'
    : state === 'open'
      ? 'border-[#D4AF37]'
      : 'border-[#DDE3E7]'

  return (
    <Card className={`border-2 ${borderColor} relative overflow-hidden`}>
      {completed && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" aria-hidden="true" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            ${completed ? 'bg-[#E8F5E9]' : state === 'open' ? 'bg-[#FFF8DC]' : 'bg-gray-100'}`}
          >
            {locked
              ? <Lock className="w-5 h-5 text-gray-400" aria-hidden="true" />
              : <Icon className={`w-5 h-5 ${completed ? 'text-[#2E7D32]' : state === 'open' ? 'text-[#7B5E00]' : 'text-gray-400'}`} aria-hidden="true" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-[#5A6472] font-medium">Phase {number}</span>
              <PhaseStatusBadge state={state} />
              {completed && <Badge variant="green">Completed</Badge>}
            </div>
            <h2 className="text-base font-semibold text-[#12304A]">{title}</h2>
            <div className="mt-2 text-sm text-[#5A6472]">{children}</div>
          </div>
        </div>

        {!completed && !locked && state === 'not_open' && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-[#5A6472]">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            This phase is not currently open. Please check back when the project administrator makes it available.
          </div>
        )}
        {!completed && !locked && state === 'closed' && (
          <div className="mt-4 bg-[#FFEBEE] rounded-lg p-3 text-xs text-[#C62828]">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            This phase has closed. If you believe this is an error, please contact the project administrator.
          </div>
        )}
        {!completed && !locked && state === 'open' && actionPath && (
          <div className="mt-4">
            <ButtonLink to={actionPath} variant="primary" size="sm" className="w-full sm:w-auto">
                {actionLabel}
                <ChevronRight className="w-4 h-4" />
              </ButtonLink>
          </div>
        )}
        {completed && actionPath && (
          <div className="mt-4">
            <ButtonLink to={actionPath} variant="outline" size="sm">
                View Submission
                <ChevronRight className="w-4 h-4" />
              </ButtonLink>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const location = useLocation()
  const justRegistered = (location.state as { registered?: boolean })?.registered

  const [completion, setCompletion] = useState<CompletionStatus>({
    preSubmitted: false, postSubmitted: false, certificateIssued: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function loadStatus() {
      try {
        const [preSnap, postSnap, certSnap] = await Promise.all([
          getDoc(doc(db, 'surveyResponses', `${profile!.uid}_pre`)),
          getDoc(doc(db, 'surveyResponses', `${profile!.uid}_post`)),
          getDoc(doc(db, 'certificates', profile!.uid)),
        ])
        setCompletion({
          preSubmitted: preSnap.exists(),
          postSubmitted: postSnap.exists(),
          certificateIssued: certSnap.exists() && certSnap.data()?.status === 'issued',
        })
      } catch (err) {
        console.error('Failed to load completion status', err)
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [profile])

  const { preSurveyState, postSurveyState, certificatePhaseState } = settings
  const certEligible =
    completion.preSubmitted &&
    completion.postSubmitted &&
    certificatePhaseState === 'open' &&
    !completion.certificateIssued

  if (!profile) return <Spinner label="Loading dashboard…" />

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      {justRegistered && (
        <div className="mb-6">
          <Alert variant="success" title="Account created successfully!">
            Welcome to the RAISSAT Digital Food Systems Project. Your participant ID is{' '}
            <strong>{profile.participantId}</strong>. Keep this for your records.
          </Alert>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#12304A]">
          Welcome, {profile.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-[#5A6472] mt-1">
          Participant ID: <strong className="font-mono text-[#12304A]">{profile.participantId}</strong>
          {' · '}{profile.department}{' · '}{profile.academicLevel}
        </p>
      </div>

      {/* Progress bar */}
      {!loading && (
        <div className="mb-8 bg-white border border-[#DDE3E7] rounded-lg p-4">
          <div className="flex justify-between text-xs text-[#5A6472] mb-2">
            <span>Your progress</span>
            <span>
              {[completion.preSubmitted, completion.postSubmitted, completion.certificateIssued]
                .filter(Boolean).length} / 3 phases complete
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-[#2E7D32] rounded-full transition-all duration-500"
              style={{
                width: `${([completion.preSubmitted, completion.postSubmitted, completion.certificateIssued]
                  .filter(Boolean).length / 3) * 100}%`
              }}
              role="progressbar"
              aria-valuenow={[completion.preSubmitted, completion.postSubmitted, completion.certificateIssued].filter(Boolean).length}
              aria-valuemin={0}
              aria-valuemax={3}
            />
          </div>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading your status…" />
      ) : (
        <div className="space-y-4">
          {/* Phase 1: Pre-Assessment */}
          <PhaseCard
            number="1"
            title="Pre-Training Assessment"
            icon={ClipboardList}
            state={preSurveyState}
            completed={completion.preSubmitted}
            locked={false}
            actionPath="/assessment/pre"
            actionLabel="Start Assessment"
          >
            Establish your baseline digital literacy and tool awareness before the training programme.
            Takes approximately 6–8 minutes.
          </PhaseCard>

          {/* Phase 2: Post-Assessment */}
          <PhaseCard
            number="2"
            title="Post-Training Assessment"
            icon={ClipboardList}
            state={postSurveyState}
            completed={completion.postSubmitted}
            locked={!completion.preSubmitted}
            actionPath="/assessment/post"
            actionLabel="Start Post-Assessment"
          >
            {!completion.preSubmitted
              ? 'Complete the pre-training assessment first.'
              : 'Reflect on your learning from the training programme. Takes approximately 6–8 minutes.'}
          </PhaseCard>

          {/* Phase 3: Certificate */}
          <PhaseCard
            number="3"
            title="Certificate of Completion"
            icon={Award}
            state={certificatePhaseState}
            completed={completion.certificateIssued}
            locked={!completion.preSubmitted || !completion.postSubmitted}
            actionPath="/certificate"
            actionLabel="Generate Certificate"
          >
            {!completion.preSubmitted || !completion.postSubmitted
              ? 'Complete both assessments to become eligible for your certificate.'
              : certEligible
                ? 'You are eligible! Generate and download your certificate of completion.'
                : completion.certificateIssued
                  ? 'Your certificate has been issued. Download it below.'
                  : certificatePhaseState !== 'open'
                    ? 'The certificate phase is not yet open. Check back after the programme.'
                    : 'Generating certificates requires all phases to be complete.'
            }
          </PhaseCard>
        </div>
      )}

      {/* Programme details */}
      <div className="mt-8 bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[#12304A] mb-3">Programme Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#5A6472]">Date</p>
            <p className="font-medium text-[#12304A]">{settings.programmeDate}</p>
          </div>
          <div>
            <p className="text-xs text-[#5A6472]">Location</p>
            <p className="font-medium text-[#12304A]">{settings.programmeLocation}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-[#5A6472]">Theme</p>
            <p className="font-medium text-[#12304A] text-xs leading-snug">{settings.programmeTitle}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
