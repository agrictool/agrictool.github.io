import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useSettings } from '../../contexts/SettingsContext'
import { PhaseStatusBadge, Spinner } from '../../components/ui'
import { Users, ClipboardCheck, Award, BookOpen, AlertCircle, TrendingUp } from 'lucide-react'

interface Counts {
  registered: number; preCompleted: number; postCompleted: number
  certificates: number; pendingTools: number; approvedTools: number
}

function StatCard({ label, value, icon: Icon, to, color = 'green' }: {
  label: string; value: number | string; icon: React.ElementType
  to?: string; color?: 'green' | 'navy' | 'gold' | 'red'
}) {
  const colors = {
    green: 'bg-[#E8F5E9] text-[#2E7D32]',
    navy:  'bg-[#E3EBF0] text-[#12304A]',
    gold:  'bg-[#FFF8DC] text-[#7B5E00]',
    red:   'bg-[#FFEBEE] text-[#C62828]',
  }
  const card = (
    <div className="bg-white border border-[#DDE3E7] rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#5A6472] mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#12304A]">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function AdminOverviewPage() {
  const { settings } = useSettings()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCounts() {
      try {
        const [regSnap, preSnap, postSnap, certSnap, pendingSnap, approvedSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'surveyResponses'), where('surveyType', '==', 'pre'))),
          getCountFromServer(query(collection(db, 'surveyResponses'), where('surveyType', '==', 'post'))),
          getCountFromServer(query(collection(db, 'certificates'), where('status', '==', 'issued'))),
          getCountFromServer(query(collection(db, 'toolkitEntries'), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, 'toolkitEntries'), where('status', '==', 'approved'))),
        ])
        setCounts({
          registered: regSnap.data().count,
          preCompleted: preSnap.data().count,
          postCompleted: postSnap.data().count,
          certificates: certSnap.data().count,
          pendingTools: pendingSnap.data().count,
          approvedTools: approvedSnap.data().count,
        })
      } catch (e) {
        console.error('Failed to load counts', e)
      } finally {
        setLoading(false)
      }
    }
    loadCounts()
  }, [])

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#12304A]">Admin Overview</h1>
        <p className="text-sm text-[#5A6472] mt-0.5">{settings.programmeTitle}</p>
      </div>

      {loading ? <Spinner /> : counts && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Registered Participants" value={counts.registered} icon={Users} to="/admin/participants" color="navy" />
            <StatCard label="Pre-Assessment Complete" value={counts.preCompleted} icon={ClipboardCheck} to="/admin/pre-survey" color="green" />
            <StatCard label="Post-Assessment Complete" value={counts.postCompleted} icon={ClipboardCheck} to="/admin/post-survey" color="green" />
            <StatCard label="Certificates Issued" value={counts.certificates} icon={Award} to="/admin/certificates" color="gold" />
            <StatCard label="Pending Tool Reviews" value={counts.pendingTools} icon={AlertCircle} to="/admin/toolkit" color={counts.pendingTools > 0 ? 'red' : 'gray' as 'navy'} />
            <StatCard label="Approved Tools" value={counts.approvedTools} icon={BookOpen} to="/admin/toolkit" color="navy" />
          </div>

          {/* Phase status */}
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#12304A]">Programme Phases</h2>
              <Link to="/admin/phases" className="text-xs text-[#2E7D32] hover:underline">Manage →</Link>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Phase 1 — Pre-Training Assessment', state: settings.preSurveyState },
                { label: 'Phase 2 — Post-Training Assessment', state: settings.postSurveyState },
                { label: 'Phase 3 — Certificate of Completion', state: settings.certificatePhaseState },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between text-sm">
                  <span className="text-[#374151]">{p.label}</span>
                  <PhaseStatusBadge state={p.state} />
                </div>
              ))}
            </div>
          </div>

          {/* Analytics shortcut */}
          <div className="bg-[#12304A] text-white rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold mb-1">Impact Analysis</h2>
                <p className="text-sm text-blue-200">
                  View knowledge gain, tool familiarity changes, department breakdowns, and qualitative feedback.
                </p>
              </div>
              <Link to="/admin/impact"
                className="flex-shrink-0 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1B5E20] transition-colors">
                <TrendingUp className="w-4 h-4 inline mr-1" /> View Analysis
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
