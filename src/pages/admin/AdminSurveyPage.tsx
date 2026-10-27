import { useState, useEffect } from 'react'
import { collection, getDocs, doc, query, where, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, Button, Alert, Spinner } from '../../components/ui'
import { Download, RotateCcw, Search } from 'lucide-react'
import type { SurveyResponse } from '../../types'

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s) || /^[=+\-@]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function flattenAnswers(answers: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      for (const [mk, mv] of Object.entries(v as Record<string, unknown>)) {
        flat[`${k}_${mk}`] = String(mv ?? '')
      }
    } else if (Array.isArray(v)) {
      flat[k] = v.join('|')
    } else {
      flat[k] = String(v ?? '')
    }
  }
  return flat
}

export default function AdminSurveyPage({ type }: { type: 'pre' | 'post' }) {
  const { profile } = useAuth()
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SurveyResponse | null>(null)
  const [search, setSearch] = useState('')
  const [reopening, setReopening] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'surveyResponses'), where('surveyType', '==', type))).then(snap => {
      setResponses(snap.docs.map(d => d.data() as SurveyResponse))
      setLoading(false)
    })
  }, [type])

  const filtered = responses.filter(r =>
    !search ||
    r.participantId.toLowerCase().includes(search.toLowerCase()) ||
    r.userId.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    if (!filtered.length) return
    const allKeys = new Set<string>(['participantId', 'userId', 'surveyType', 'submittedAt', 'schemaVersion'])
    filtered.forEach(r => Object.keys(flattenAnswers(r.answers)).forEach(k => allKeys.add(k)))
    const headers = Array.from(allKeys)
    const rows = filtered.map(r => {
      const flat = flattenAnswers(r.answers)
      return headers.map(h => escapeCsvCell(
        h === 'participantId' ? r.participantId :
        h === 'userId' ? r.userId :
        h === 'surveyType' ? r.surveyType :
        h === 'submittedAt' ? r.submittedAt :
        h === 'schemaVersion' ? r.schemaVersion :
        flat[h] ?? ''
      )).join(',')
    })
    const content = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${type}_survey_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleReopen = async (userId: string) => {
    if (!profile) return
    if (!window.confirm('Reopen this submission? The participant will be able to resubmit. Provide a reason in the audit log.')) return
    setReopening(userId)
    try {
      const docId = `${userId}_${type}`
      await updateDoc(doc(db, 'surveyResponses', docId), { completionStatus: 'reopened' })
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: profile.uid,
        action: `survey_reopened_${type}`,
        target: docId,
        timestamp: new Date().toISOString(),
        metadata: { reason: 'Admin reopened from survey review page' },
      })
      setResponses(prev => prev.filter(r => r.userId !== userId))
      setSelected(null)
      setSuccess('Submission reopened. The participant can now resubmit.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError('Failed to reopen submission.')
      console.error(e)
    } finally {
      setReopening(null)
    }
  }

  const label = type === 'pre' ? 'Pre-Training' : 'Post-Training'

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12304A]">{label} Assessments</h1>
          <p className="text-sm text-[#5A6472]">{responses.length} submission{responses.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6472]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by participant ID or user ID…"
          className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E7] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {loading ? <Spinner /> : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-[#5A6472] text-sm bg-[#F9FBF9] rounded-xl border border-[#DDE3E7]">
                  No submissions yet.
                </div>
              ) : filtered.map(r => (
                <button key={r.userId} onClick={() => setSelected(r)}
                  className={`w-full text-left p-4 border rounded-xl transition-colors
                    ${selected?.userId === r.userId
                      ? 'border-[#2E7D32] bg-[#E8F5E9]'
                      : 'border-[#DDE3E7] bg-white hover:border-[#2E7D32]/40'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-medium text-[#12304A]">{r.participantId}</p>
                      <p className="text-xs text-[#5A6472] mt-0.5">{new Date(r.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="green">Submitted</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-[#12304A]">{selected.participantId}</p>
                <p className="text-xs text-[#5A6472]">Submitted {new Date(selected.submittedAt).toLocaleString()}</p>
                <p className="text-xs text-[#5A6472]">Schema version {selected.schemaVersion}</p>
              </div>
              <Button variant="danger" size="sm"
                loading={reopening === selected.userId}
                onClick={() => handleReopen(selected.userId)}>
                <RotateCcw className="w-3.5 h-3.5" /> Reopen
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#12304A] uppercase tracking-wide">Responses</h3>
              {Object.entries(flattenAnswers(selected.answers)).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <p className="text-[#5A6472] mb-0.5">{k}</p>
                  <p className="text-[#12304A] font-medium bg-[#F9FBF9] px-2 py-1 rounded">{v || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
