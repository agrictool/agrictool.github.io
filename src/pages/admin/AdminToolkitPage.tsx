import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, Button, Alert, Spinner } from '../../components/ui'
import { CheckCircle, XCircle, Trash2, Edit2, ExternalLink } from 'lucide-react'
import type { ToolkitEntry, ToolkitPrivate, ToolStatus } from '../../types'

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_BADGE: Record<ToolStatus, 'gold' | 'green' | 'red'> = {
  pending: 'gold', approved: 'green', rejected: 'red',
}

interface EntryWithPrivate extends ToolkitEntry { private?: ToolkitPrivate }

export default function AdminToolkitPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('pending')
  const [entries, setEntries] = useState<EntryWithPrivate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EntryWithPrivate | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [moderationNote, setModerationNote] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<ToolkitEntry>>({})

  useEffect(() => {
    getDocs(collection(db, 'toolkitEntries')).then(snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ToolkitEntry)))
      setLoading(false)
    })
  }, [])

  const filtered = entries.filter(e =>
    tab === 'all' ? true : e.status === tab
  )

  const loadPrivate = async (toolId: string) => {
    const snap = await getDoc(doc(db, 'toolkitPrivate', toolId))
    return snap.exists() ? snap.data() as ToolkitPrivate : undefined
  }

  const handleSelect = async (entry: ToolkitEntry) => {
    const priv = await loadPrivate(entry.id)
    setSelected({ ...entry, private: priv })
    setModerationNote(priv?.moderationNote ?? '')
    setEditMode(false)
    setEditData({})
  }

  const handleStatusChange = async (toolId: string, newStatus: ToolStatus) => {
    if (!profile) return
    setActionLoading(toolId)
    const now = new Date().toISOString()
    try {
      await updateDoc(doc(db, 'toolkitEntries', toolId), {
        status: newStatus,
        updatedAt: now,
        ...(newStatus === 'approved' ? { approvedAt: now } : {}),
      })
      // Save moderation note to private
      if (moderationNote) {
        const privRef = doc(db, 'toolkitPrivate', toolId)
        const privSnap = await getDoc(privRef)
        if (privSnap.exists()) {
          await updateDoc(privRef, { moderationNote, reviewedBy: profile.uid, reviewedAt: now })
        } else {
          await setDoc(privRef, { moderationNote, reviewedBy: profile.uid, reviewedAt: now })
        }
      }
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: profile.uid, action: `toolkit_${newStatus}`, target: toolId,
        timestamp: now,
      })
      setEntries(prev => prev.map(e => e.id === toolId ? { ...e, status: newStatus, updatedAt: now } : e))
      setSelected(null)
      setSuccess(`Tool ${newStatus} successfully.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  const handleEdit = async (toolId: string) => {
    if (!profile || !editMode) return
    setActionLoading(toolId)
    try {
      const updates = { ...editData, updatedAt: new Date().toISOString() }
      await updateDoc(doc(db, 'toolkitEntries', toolId), updates)
      setEntries(prev => prev.map(e => e.id === toolId ? { ...e, ...updates } : e))
      setEditMode(false)
      setSuccess('Tool updated. Returning to review status.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  const handleDelete = async (toolId: string) => {
    if (!profile || !window.confirm('Delete this tool entry permanently? This cannot be undone.')) return
    setActionLoading(toolId)
    try {
      await deleteDoc(doc(db, 'toolkitEntries', toolId))
      await deleteDoc(doc(db, 'toolkitPrivate', toolId)).catch(() => {})
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: profile.uid, action: 'toolkit_deleted', target: toolId,
        timestamp: new Date().toISOString(),
      })
      setEntries(prev => prev.filter(e => e.id !== toolId))
      setSelected(null)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending', label: `Pending (${entries.filter(e => e.status === 'pending').length})` },
    { key: 'approved', label: `Approved (${entries.filter(e => e.status === 'approved').length})` },
    { key: 'rejected', label: `Rejected (${entries.filter(e => e.status === 'rejected').length})` },
    { key: 'all', label: `All (${entries.length})` },
  ]

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-[#12304A] mb-1">Toolkit Moderation</h1>
      <p className="text-sm text-[#5A6472] mb-5">Review, approve, edit and manage submitted digital tools.</p>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      {/* Tabs */}
      <div className="flex border-b border-[#DDE3E7] mb-5 gap-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null) }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2
              ${tab === t.key
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-[#5A6472] hover:text-[#12304A]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div>
          {loading ? <Spinner /> : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#5A6472] text-sm bg-[#F9FBF9] rounded-xl border border-[#DDE3E7]">
              No {tab === 'all' ? '' : tab} submissions.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filtered.map(entry => (
                <button key={entry.id} onClick={() => handleSelect(entry)}
                  className={`w-full text-left p-4 border rounded-xl transition-colors
                    ${selected?.id === entry.id
                      ? 'border-[#2E7D32] bg-[#E8F5E9]'
                      : 'border-[#DDE3E7] bg-white hover:border-[#2E7D32]/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#12304A] text-sm truncate">{entry.toolName}</p>
                      <p className="text-xs text-[#5A6472] mt-0.5">{entry.category}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[entry.status]}>{entry.status}</Badge>
                  </div>
                  <p className="text-xs text-[#5A6472] mt-1">{new Date(entry.submittedAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-white border border-[#DDE3E7] rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-[#12304A]">{selected.toolName}</h2>
                <p className="text-xs text-[#5A6472]">{selected.category} · {selected.toolType}</p>
              </div>
              <Badge variant={STATUS_BADGE[selected.status]}>{selected.status}</Badge>
            </div>

            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.toolName}
                className="max-h-28 rounded border border-[#DDE3E7] object-contain" />
            )}

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#12304A]">Tool Name</label>
                  <input value={editData.toolName ?? selected.toolName}
                    onChange={e => setEditData(d => ({ ...d, toolName: e.target.value }))}
                    className="mt-1 w-full border border-[#DDE3E7] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#12304A]">Function Description</label>
                  <textarea value={editData.function ?? selected.function}
                    onChange={e => setEditData(d => ({ ...d, function: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full border border-[#DDE3E7] rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" loading={!!actionLoading}
                    onClick={() => handleEdit(selected.id)}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setEditData({}) }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-[#5A6472] mb-1">What It Does</p>
                  <p className="text-sm text-[#374151]">{selected.function}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-[#5A6472]">Cost</p><p className="font-medium">{selected.costType}{selected.costDetails && ` — ${selected.costDetails}`}</p></div>
                  <div><p className="text-[#5A6472]">Users</p><p className="font-medium">{selected.users?.join(', ') || '—'}</p></div>
                  <div><p className="text-[#5A6472]">Submitted</p><p className="font-medium">{new Date(selected.submittedAt).toLocaleDateString()}</p></div>
                  {selected.officialUrl && (
                    <div>
                      <p className="text-[#5A6472]">URL</p>
                      <a href={selected.officialUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[#2E7D32] underline flex items-center gap-1">
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {selected.private && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-amber-900 mb-1">Private contributor info</p>
                    {selected.private.contributorName && <p>Name: {selected.private.contributorName}</p>}
                    {selected.private.contributorOrg && <p>Org: {selected.private.contributorOrg}</p>}
                    {selected.private.contactEmail && <p>Email: {selected.private.contactEmail}</p>}
                  </div>
                )}
              </>
            )}

            {/* Moderation note */}
            <div>
              <label className="text-xs font-medium text-[#12304A]">Internal Moderation Note</label>
              <textarea value={moderationNote} onChange={e => setModerationNote(e.target.value)}
                rows={2} placeholder="Optional note for your records…"
                className="mt-1 w-full border border-[#DDE3E7] rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DDE3E7]">
              {selected.status !== 'approved' && (
                <Button variant="primary" size="sm" loading={actionLoading === selected.id}
                  onClick={() => handleStatusChange(selected.id, 'approved')}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              )}
              {selected.status !== 'rejected' && (
                <Button variant="danger" size="sm" loading={actionLoading === selected.id}
                  onClick={() => handleStatusChange(selected.id, 'rejected')}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
              <Button variant="ghost" size="sm" loading={actionLoading === selected.id}
                onClick={() => handleDelete(selected.id)}>
                <Trash2 className="w-4 h-4 text-[#C62828]" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
