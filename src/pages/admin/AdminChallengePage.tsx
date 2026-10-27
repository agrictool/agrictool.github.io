import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Alert, Card, Spinner } from '../../components/ui'
import { Trophy, Plus, Save } from 'lucide-react'
import type { GroupChallengeScore, CriterionScore } from '../../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CRITERIA: { key: keyof CriterionScore; label: string; description: string }[] = [
  { key: 'problemIdentification', label: 'Problem Identification', description: 'Clear formulation of the value-chain challenge' },
  { key: 'toolSelection', label: 'Tool Selection', description: 'Appropriateness of the digital tools chosen' },
  { key: 'applicationLogic', label: 'Application Logic', description: 'How the technology addresses the problem' },
  { key: 'feasibilityCosting', label: 'Feasibility & Costing', description: 'Internet, hardware and pricing considerations' },
  { key: 'presentationClarity', label: 'Presentation Clarity', description: 'Teamwork, clarity, defence of choices' },
]

const EMPTY_SCORES: CriterionScore = {
  problemIdentification: 0, toolSelection: 0, applicationLogic: 0,
  feasibilityCosting: 0, presentationClarity: 0,
}

interface GroupForm { groupLabel: string; scores: CriterionScore; notes: string }

export default function AdminChallengePage() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<GroupChallengeScore[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [forms, setForms] = useState<GroupForm[]>([
    { groupLabel: 'Group A', scores: { ...EMPTY_SCORES }, notes: '' },
    { groupLabel: 'Group B', scores: { ...EMPTY_SCORES }, notes: '' },
  ])

  useEffect(() => {
    getDocs(collection(db, 'groupChallengeScores')).then(snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupChallengeScore)))
      setLoading(false)
    })
  }, [])

  const total = (s: CriterionScore) => Object.values(s).reduce((a, b) => a + b, 0)

  const setScore = (formIdx: number, criterion: keyof CriterionScore, value: number) => {
    setForms(prev => prev.map((f, i) =>
      i === formIdx ? { ...f, scores: { ...f.scores, [criterion]: Math.min(4, Math.max(0, value)) } } : f
    ))
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const saved: GroupChallengeScore[] = []
      for (const form of forms) {
        const docRef = await addDoc(collection(db, 'groupChallengeScores'), {
          groupId: form.groupLabel.toLowerCase().replace(/\s/g, '_'),
          groupLabel: form.groupLabel,
          criterionScores: form.scores,
          totalScore: total(form.scores),
          facilitator: profile.uid,
          notes: form.notes,
          createdAt: now,
          updatedAt: now,
        })
        saved.push({ id: docRef.id, groupId: form.groupLabel, groupLabel: form.groupLabel,
          criterionScores: form.scores, totalScore: total(form.scores),
          facilitator: profile.uid, notes: form.notes, createdAt: now, updatedAt: now })
      }
      setGroups(saved)
      setShowForm(false)
      setSuccess('Scores saved successfully.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  // Chart data
  const chartData = CRITERIA.map(c => {
    const entry: Record<string, number | string> = { name: c.label }
    groups.forEach(g => { entry[g.groupLabel] = g.criterionScores[c.key] ?? 0 })
    return entry
  })

  const COLORS = ['#12304A', '#2E7D32', '#D4AF37']

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#12304A]">Group Challenge Scoring</h1>
          <p className="text-sm text-[#5A6472]">Score each criterion 0–4. Maximum total: 20.</p>
        </div>
        {groups.length === 0 && (
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Enter Scores
          </Button>
        )}
      </div>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      {loading ? <Spinner /> : groups.length > 0 ? (
        <div className="space-y-6">
          {/* Winner banner */}
          {groups.length > 0 && (() => {
            const winner = [...groups].sort((a, b) => b.totalScore - a.totalScore)[0]
            return (
              <div className="bg-[#12304A] text-white rounded-xl p-5 flex items-center gap-4">
                <Trophy className="w-10 h-10 text-[#D4AF37] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest">Challenge Winner</p>
                  <p className="text-xl font-bold">{winner.groupLabel}</p>
                  <p className="text-sm text-blue-200">Score: {winner.totalScore} / 20</p>
                </div>
              </div>
            )
          })()}

          {/* Scores table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FBF9]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Criterion</th>
                    {groups.map(g => <th key={g.id} className="text-center px-4 py-3 text-xs font-semibold text-[#5A6472]">{g.groupLabel}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3E7]">
                  {CRITERIA.map((c, i) => (
                    <tr key={c.key} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FBF9]'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#12304A] text-xs">{c.label}</p>
                        <p className="text-xs text-[#5A6472]">{c.description}</p>
                      </td>
                      {groups.map(g => (
                        <td key={g.id} className="px-4 py-3 text-center font-bold text-[#12304A]">
                          {g.criterionScores[c.key]} / 4
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-[#12304A]">
                    <td className="px-4 py-3 font-bold text-white text-sm">Total</td>
                    {groups.map(g => (
                      <td key={g.id} className="px-4 py-3 text-center font-bold text-[#D4AF37] text-lg">{g.totalScore} / 20</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Criterion comparison chart */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4">Score Comparison by Criterion</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                {groups.map((g, i) => (
                  <Bar key={g.id} dataKey={g.groupLabel} fill={COLORS[i % COLORS.length]} radius={[0, 3, 3, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : showForm ? (
        <div className="space-y-6">
          {forms.map((form, fi) => (
            <Card key={fi} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <input value={form.groupLabel} onChange={e => setForms(prev => prev.map((f, i) => i === fi ? { ...f, groupLabel: e.target.value } : f))}
                  className="font-bold text-[#12304A] text-base border-0 border-b border-[#DDE3E7] focus:outline-none focus:border-[#2E7D32] bg-transparent" />
                <span className="text-sm font-bold text-[#12304A]">Total: {total(form.scores)} / 20</span>
              </div>
              <div className="space-y-3">
                {CRITERIA.map(c => (
                  <div key={c.key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[#12304A]">{c.label}</p>
                      <p className="text-xs text-[#5A6472]">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0,1,2,3,4].map(v => (
                        <button key={v} onClick={() => setScore(fi, c.key, v)}
                          className={`w-8 h-8 rounded text-xs font-bold transition-colors
                            ${form.scores[c.key] === v
                              ? 'bg-[#12304A] text-white'
                              : 'bg-gray-100 text-[#374151] hover:bg-[#E8F5E9]'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <textarea value={form.notes} onChange={e => setForms(prev => prev.map((f, i) => i === fi ? { ...f, notes: e.target.value } : f))}
                placeholder="Optional notes…" rows={2}
                className="mt-4 w-full border border-[#DDE3E7] rounded px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
            </Card>
          ))}
          <div className="flex gap-3">
            <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
              <Save className="w-4 h-4" /> Save All Scores
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#F9FBF9] border border-[#DDE3E7] rounded-xl">
          <Trophy className="w-10 h-10 text-[#5A6472]/40 mx-auto mb-3" />
          <p className="font-semibold text-[#12304A]">No scores recorded yet</p>
          <p className="text-sm text-[#5A6472] mb-4">Enter group challenge scores after the training event.</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Enter Scores
          </Button>
        </div>
      )}
    </div>
  )
}
