import { useState } from 'react'
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Button, Alert, PhaseStatusBadge, Card } from '../../components/ui'
import { ToggleLeft, ToggleRight, AlertTriangle, Clock, User } from 'lucide-react'
import type { PhaseState } from '../../types'

interface PhaseConfig {
  key: 'preSurveyState' | 'postSurveyState' | 'certificatePhaseState'
  label: string
  description: string
  warningOpen: string
  warningClose: string
}

const PHASES: PhaseConfig[] = [
  {
    key: 'preSurveyState',
    label: 'Phase 1 — Pre-Training Assessment',
    description: 'Controls whether participants can submit the pre-training digital readiness survey.',
    warningOpen: 'Opening this phase will allow all registered participants to submit the pre-training assessment. Ensure the programme date is approaching.',
    warningClose: 'Closing this phase will prevent any new pre-training submissions. Existing responses are preserved.',
  },
  {
    key: 'postSurveyState',
    label: 'Phase 2 — Post-Training Assessment',
    description: 'Controls whether participants can submit the post-training evaluation survey.',
    warningOpen: 'Opening this phase will allow all registered participants to submit the post-training assessment. This is typically opened after the training event.',
    warningClose: 'Closing this phase will prevent any new post-training submissions. Existing responses are preserved.',
  },
  {
    key: 'certificatePhaseState',
    label: 'Phase 3 — Certificate of Completion',
    description: 'Controls whether eligible participants can generate and download their certificate.',
    warningOpen: 'Opening this phase will allow participants who have completed both assessments to generate their certificate. This is typically opened after post-assessment analysis.',
    warningClose: 'Closing this phase will prevent new certificate generation. Previously issued certificates are not affected.',
  },
]

function PhaseToggle({ phase, currentState, onToggle, saving }: {
  phase: PhaseConfig
  currentState: PhaseState
  onToggle: (key: string, newState: PhaseState) => void
  saving: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [pendingState, setPendingState] = useState<PhaseState | null>(null)

  const handleClick = (targetState: PhaseState) => {
    setPendingState(targetState)
    setConfirming(true)
  }

  const handleConfirm = () => {
    if (pendingState) onToggle(phase.key, pendingState)
    setConfirming(false)
    setPendingState(null)
  }

  const warningText = pendingState === 'open' ? phase.warningOpen : phase.warningClose

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-[#12304A] text-sm">{phase.label}</h3>
            <PhaseStatusBadge state={currentState} />
          </div>
          <p className="text-sm text-[#5A6472]">{phase.description}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {currentState !== 'open' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleClick('open')}
              disabled={saving}
            >
              <ToggleRight className="w-4 h-4" /> Open Phase
            </Button>
          )}
          {currentState === 'open' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleClick('closed')}
              disabled={saving}
            >
              <ToggleLeft className="w-4 h-4" /> Close Phase
            </Button>
          )}
        </div>
      </div>

      {confirming && pendingState && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Confirm: {pendingState === 'open' ? 'Open' : 'Close'} this phase?
              </p>
              <p className="text-sm text-amber-800">{warningText}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleConfirm} loading={saving}>
              Yes, {pendingState === 'open' ? 'Open' : 'Close'} Phase
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setPendingState(null) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-[#5A6472]">
        <Clock className="w-3 h-3" />
        <span>Status: <strong>{currentState === 'not_open' ? 'Not yet opened' : currentState === 'open' ? 'Currently open' : 'Closed'}</strong></span>
      </div>
    </Card>
  )
}

export default function AdminPhasesPage() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleToggle = async (key: string, newState: PhaseState) => {
    if (!profile) return
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const now = new Date().toISOString()
      await updateDoc(doc(db, 'programmeSettings', 'current'), {
        [key]: newState,
        updatedAt: now,
        updatedBy: profile.uid,
      })
      // Audit log
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: profile.uid,
        action: `phase_${newState}`,
        target: key,
        timestamp: now,
        metadata: { newState, previousState: settings[key as keyof typeof settings] },
      })
      setSuccess(`Phase updated to "${newState}" successfully.`)
    } catch (e) {
      setError('Failed to update phase. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#12304A]">Programme Phases</h1>
        <p className="text-sm text-[#5A6472] mt-1">
          Control when participants can access each phase. All phases start as "Not Open" and must be opened manually.
          Phases are independent — opening one does not affect others.
        </p>
      </div>

      {success && (
        <div className="mb-5"><Alert variant="success">{success}</Alert></div>
      )}
      {error && (
        <div className="mb-5"><Alert variant="error">{error}</Alert></div>
      )}

      <div className="space-y-4">
        {PHASES.map(phase => (
          <PhaseToggle
            key={phase.key}
            phase={phase}
            currentState={settings[phase.key]}
            onToggle={handleToggle}
            saving={saving}
          />
        ))}
      </div>

      <div className="mt-8 bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-4">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-[#5A6472] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#12304A] mb-1">Last updated by</p>
            <p className="text-xs text-[#5A6472]">
              {settings.updatedBy ? `UID: ${settings.updatedBy}` : 'Not yet modified'}{' '}
              {settings.updatedAt && `— ${new Date(settings.updatedAt).toLocaleString()}`}
            </p>
            <p className="text-xs text-[#5A6472] mt-1">
              All phase changes are recorded in the audit log.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
