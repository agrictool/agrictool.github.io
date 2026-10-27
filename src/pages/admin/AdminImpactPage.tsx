import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Spinner, Button } from '../../components/ui'
import { Download, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import type { SurveyResponse, UserProfile } from '../../types'

const TOOL_LABELS: Record<string, string> = {
  gee: 'Google Earth Engine', farmmap: 'FarmMap GIS', plantix: 'Plantix',
  faogiews: 'FAO GIEWS', dhis2: 'DHIS2', agriapp: 'AgriApp/FarmBee', awsiot: 'AWS/IoT Dashboards',
}
const TOOL_IDS = Object.keys(TOOL_LABELS)
const COLORS = ['#2E7D32','#12304A','#D4AF37','#1565C0','#AD1457','#558B2F','#4527A0']

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s) || /^[=+\-@]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
function downloadCSV(content: string, name: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

interface MatchedPair { uid: string; pre: SurveyResponse; post: SurveyResponse; profile?: UserProfile }

function mean(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export default function AdminImpactPage() {
  const [pairs, setPairs] = useState<MatchedPair[]>([])
  const [preOnly, setPreOnly] = useState<SurveyResponse[]>([])
  const [postOnly, setPostOnly] = useState<SurveyResponse[]>([])
    const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [preSnap, postSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'surveyResponses'), where('surveyType', '==', 'pre'))),
        getDocs(query(collection(db, 'surveyResponses'), where('surveyType', '==', 'post'))),
        getDocs(collection(db, 'users')),
      ])
      const preMap = new Map<string, SurveyResponse>()
      preSnap.docs.forEach(d => { const r = d.data() as SurveyResponse; preMap.set(r.userId, r) })
      const postMap = new Map<string, SurveyResponse>()
      postSnap.docs.forEach(d => { const r = d.data() as SurveyResponse; postMap.set(r.userId, r) })
      const profMap: Record<string, UserProfile> = {}
      usersSnap.docs.forEach(d => { const u = d.data() as UserProfile; profMap[u.uid] = u })

      const matched: MatchedPair[] = []
      const preOnlyArr: SurveyResponse[] = []
      const postOnlyArr: SurveyResponse[] = []

      preMap.forEach((pre, uid) => {
        if (postMap.has(uid)) matched.push({ uid, pre, post: postMap.get(uid)!, profile: profMap[uid] })
        else preOnlyArr.push(pre)
      })
      postMap.forEach((post, uid) => {
        if (!preMap.has(uid)) postOnlyArr.push(post)
      })

      setPairs(matched)
      setPreOnly(preOnlyArr)
      setPostOnly(postOnlyArr)
            setLoading(false)
    }
    load()
  }, [])

  // ── Compute metrics ─────────────────────────────────────────────────────────
  const toolFamiliarityData = TOOL_IDS.map(toolId => {
    const preVals = pairs.map(p => {
      const matrix = p.pre.answers['q6_tool_matrix'] as Record<string, string> | undefined
      return matrix ? Number(matrix[toolId] ?? 0) : 0
    }).filter(v => v > 0)
    const postVals = pairs.map(p => {
      const matrix = p.post.answers['q2_tool_matrix'] as Record<string, string> | undefined
      return matrix ? Number(matrix[toolId] ?? 0) : 0
    }).filter(v => v > 0)
    return {
      name: TOOL_LABELS[toolId],
      'Pre (mean)': parseFloat(mean(preVals).toFixed(2)),
      'Post (mean)': parseFloat(mean(postVals).toFixed(2)),
      change: parseFloat((mean(postVals) - mean(preVals)).toFixed(2)),
      n: Math.min(preVals.length, postVals.length),
    }
  })

  const confidenceData = pairs.map(p => ({
    pre: Number(p.pre.answers['q3_confidence'] ?? 0),
    post: Number(p.post.answers['q1_post_confidence'] ?? 0),
  })).filter(d => d.pre > 0 && d.post > 0)

  const confidenceBands = [1,2,3,4,5].map(v => ({
    rating: String(v),
    Pre: confidenceData.filter(d => d.pre === v).length,
    Post: confidenceData.filter(d => d.post === v).length,
  }))

  const barriersData = (() => {
    const counts: Record<string, number> = {}
    preOnly.concat(pairs.map(p => p.pre)).forEach(r => {
      const arr = r.answers['q10_barriers'] as string[] | undefined
      arr?.forEach(b => { counts[b] = (counts[b] ?? 0) + 1 })
    })
    return Object.entries(counts).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))
  })()

  const careerData = (() => {
    const labels: Record<string, string> = {
      yes_significantly: 'Yes, significantly', yes_slightly: 'Yes, slightly',
      no_change: 'No change', undecided: 'Undecided',
    }
    const counts: Record<string, number> = {}
    pairs.forEach(p => {
      const v = p.post.answers['q9_career_influence'] as string | undefined
      if (v) counts[v] = (counts[v] ?? 0) + 1
    })
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
  })()

  // CSV exports
  const exportMatchedCSV = () => {
    const rows = pairs.map(p => ({
      participantId: p.pre.participantId,
      department: p.profile?.department ?? '',
      level: p.profile?.academicLevel ?? '',
      preConfidence: p.pre.answers['q3_confidence'],
      postConfidence: p.post.answers['q1_post_confidence'],
      careerInfluence: p.post.answers['q9_career_influence'],
      toolkitValue: p.post.answers['q6_toolkit_value'],
      panelRating: p.post.answers['q3_panel'],
      demoRating: p.post.answers['q4_demos'],
    }))
    const headers = Object.keys(rows[0] ?? {})
    const content = [headers.join(','), ...rows.map(r => headers.map(h => escapeCsvCell(r[h as keyof typeof r])).join(','))].join('\r\n')
    downloadCSV(content, `matched_analysis_${new Date().toISOString().slice(0,10)}.csv`)
  }

  if (loading) return <div className="p-6"><Spinner /></div>

  const totalPre = pairs.length + preOnly.length
  const totalPost = pairs.length + postOnly.length

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12304A]">Impact Analysis</h1>
          <p className="text-sm text-[#5A6472]">Self-reported data only. All metrics based on matched pre/post pairs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportMatchedCSV} disabled={pairs.length === 0}>
          <Download className="w-4 h-4" /> Export Matched Data
        </Button>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pre-Assessment Submissions', value: totalPre },
          { label: 'Post-Assessment Submissions', value: totalPost },
          { label: 'Matched Pairs', value: pairs.length },
          { label: 'Unmatched (pre only)', value: preOnly.length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#DDE3E7] rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#12304A]">{s.value}</p>
            <p className="text-xs text-[#5A6472] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {pairs.length === 0 ? (
        <div className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-xl p-10 text-center">
          <AlertCircle className="w-10 h-10 text-[#5A6472]/40 mx-auto mb-3" />
          <p className="font-semibold text-[#12304A]">No matched pairs yet</p>
          <p className="text-sm text-[#5A6472] mt-1">Charts will appear once participants have completed both assessments.</p>
        </div>
      ) : (
        <>
          {/* Confidence comparison */}
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-1">Confidence Rating Distribution (Pre vs Post)</h2>
            <p className="text-xs text-[#5A6472] mb-4">Self-reported confidence on a 1–5 scale. n = {confidenceData.length} matched pairs.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={confidenceBands}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pre" fill="#12304A" radius={[3,3,0,0]} />
                <Bar dataKey="Post" fill="#2E7D32" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tool familiarity */}
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-1">Tool Familiarity — Mean Rating Change (Pre → Post)</h2>
            <p className="text-xs text-[#5A6472] mb-4">Scale: 1 Never heard of it → 4 Practical User. Self-reported familiarity, not tested knowledge.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={toolFamiliarityData} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pre (mean)" fill="#12304A" radius={[0,3,3,0]} />
                <Bar dataKey="Post (mean)" fill="#2E7D32" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Data table */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead><tr className="border-b border-[#DDE3E7]">
                  <th className="text-left py-2 px-3 text-[#5A6472]">Tool</th>
                  <th className="text-center py-2 px-3 text-[#5A6472]">Pre Mean</th>
                  <th className="text-center py-2 px-3 text-[#5A6472]">Post Mean</th>
                  <th className="text-center py-2 px-3 text-[#5A6472]">Change</th>
                  <th className="text-center py-2 px-3 text-[#5A6472]">n</th>
                </tr></thead>
                <tbody>
                  {toolFamiliarityData.map(row => (
                    <tr key={row.name} className="border-b border-[#DDE3E7] hover:bg-[#F9FBF9]">
                      <td className="py-2 px-3 text-[#12304A]">{row.name}</td>
                      <td className="py-2 px-3 text-center">{row['Pre (mean)']}</td>
                      <td className="py-2 px-3 text-center">{row['Post (mean)']}</td>
                      <td className={`py-2 px-3 text-center font-semibold ${row.change > 0 ? 'text-[#2E7D32]' : row.change < 0 ? 'text-[#C62828]' : 'text-[#5A6472]'}`}>
                        {row.change > 0 ? '+' : ''}{row.change}
                      </td>
                      <td className="py-2 px-3 text-center text-[#5A6472]">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Career influence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
              <h2 className="text-sm font-bold text-[#12304A] mb-4">Career Influence</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={careerData} dataKey="value" nameKey="name" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {careerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
              <h2 className="text-sm font-bold text-[#12304A] mb-4">Reported Barriers (Pre-Assessment)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barriersData} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#12304A" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Qualitative table */}
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4">Qualitative Feedback — Suggestions for Improvement</h2>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[#F9FBF9] sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-[#5A6472]">Participant ID</th>
                    <th className="text-left py-2 px-3 text-[#5A6472]">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.filter(p => p.post.answers['q11_suggestions'] || p.post.answers['q30_recommendation']).map(p => (
                    <tr key={p.uid} className="border-b border-[#DDE3E7]">
                      <td className="py-2 px-3 font-mono text-[#12304A]">{p.pre.participantId}</td>
                      <td className="py-2 px-3 text-[#374151]">
                        {String(p.post.answers['q11_suggestions'] ?? p.post.answers['q30_recommendation'] ?? '')}
                      </td>
                    </tr>
                  ))}
                  {pairs.filter(p => p.post.answers['q11_suggestions'] || p.post.answers['q30_recommendation']).length === 0 && (
                    <tr><td colSpan={2} className="py-4 text-center text-[#5A6472]">No qualitative responses yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
