import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, Button, Alert, Spinner } from '../../components/ui'
import { Search, Download, ChevronUp, ChevronDown, UserX, UserCheck } from 'lucide-react'
import type { UserProfile } from '../../types'

type SortKey = 'fullName' | 'department' | 'createdAt'

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s) || /^[=+\-@]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCSV(rows: UserProfile[]): string {
  const BOM = '\uFEFF'
  const headers = ['participantId','fullName','email','department','academicLevel','phone','role','accountStatus','createdAt']
  const lines = rows.map(r => headers.map(h => escapeCsvCell(r[h as keyof UserProfile])).join(','))
  return BOM + [headers.join(','), ...lines].join('\r\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminParticipantsPage() {
  const { profile: adminProfile } = useAuth()
  const [participants, setParticipants] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const PAGE_SIZE = 20

  useEffect(() => {
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))).then(snap => {
      setParticipants(snap.docs.map(d => d.data() as UserProfile))
      setLoading(false)
    })
  }, [])

  const filtered = participants
    .filter(p => p.role === 'participant')
    .filter(p => !search || p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.participantId.toLowerCase().includes(search.toLowerCase()))
    .filter(p => !deptFilter || p.department === deptFilter)
    .filter(p => !levelFilter || p.academicLevel === levelFilter)
    .sort((a, b) => {
      const av = a[sort.key] ?? '', bv = b[sort.key] ?? ''
      return sort.dir === 'asc' ? av < bv ? -1 : 1 : av > bv ? -1 : 1
    })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
    setPage(1)
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key === k
      ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3 opacity-20" />

  const handleDeactivate = async (uid: string, currentStatus: string) => {
    if (!adminProfile) return
    setActionLoading(uid)
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active'
    try {
      await updateDoc(doc(db, 'users', uid), { accountStatus: newStatus, updatedAt: new Date().toISOString() })
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: adminProfile.uid, action: `account_${newStatus}`, target: uid,
        timestamp: new Date().toISOString(),
      })
      setParticipants(prev => prev.map(p => p.uid === uid ? { ...p, accountStatus: newStatus as 'active' | 'deactivated' } : p))
      setSuccessMsg(`Account ${newStatus} successfully.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  const handleExport = () => {
    downloadCSV(toCSV(filtered), `participants_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const departments = [...new Set(participants.map(p => p.department))].sort()
  const levels = ['100L','200L','300L','400L','500L']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12304A]">Participants</h1>
          <p className="text-sm text-[#5A6472]">{filtered.length} of {participants.filter(p => p.role === 'participant').length} participants</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {successMsg && <div className="mb-4"><Alert variant="success">{successMsg}</Alert></div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6472]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email, ID…"
            className="w-full pl-9 pr-3 py-2 border border-[#DDE3E7] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
        </div>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
          className="border border-[#DDE3E7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1) }}
          className="border border-[#DDE3E7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
          <option value="">All Levels</option>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#DDE3E7]">
            <table className="min-w-full text-sm bg-white">
              <thead className="bg-[#F9FBF9]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Participant ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472] cursor-pointer" onClick={() => toggleSort('fullName')}>
                    <span className="flex items-center gap-1">Name <SortIcon k="fullName" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472] hidden md:table-cell cursor-pointer" onClick={() => toggleSort('department')}>
                    <span className="flex items-center gap-1">Department <SortIcon k="department" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472] hidden lg:table-cell">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472] hidden lg:table-cell cursor-pointer" onClick={() => toggleSort('createdAt')}>
                    <span className="flex items-center gap-1">Registered <SortIcon k="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3E7]">
                {paged.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-[#5A6472] text-sm">No participants found.</td></tr>
                ) : paged.map(p => (
                  <tr key={p.uid} className="hover:bg-[#F9FBF9] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#12304A]">{p.participantId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#12304A] text-sm">{p.fullName}</p>
                      <p className="text-xs text-[#5A6472]">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-[#374151]">{p.department}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#374151]">{p.academicLevel}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.accountStatus === 'active' ? 'green' : 'red'}>
                        {p.accountStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#5A6472]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost" size="sm"
                        loading={actionLoading === p.uid}
                        onClick={() => handleDeactivate(p.uid, p.accountStatus)}
                        title={p.accountStatus === 'active' ? 'Deactivate account' : 'Reactivate account'}
                      >
                        {p.accountStatus === 'active'
                          ? <UserX className="w-4 h-4 text-[#C62828]" />
                          : <UserCheck className="w-4 h-4 text-[#2E7D32]" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <span className="text-sm text-[#5A6472] py-1.5 px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
