import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, Button, Alert, Spinner } from '../../components/ui'
import { Award, Download, ShieldOff, ShieldCheck, Search } from 'lucide-react'
import type { CertificateRecord } from '../../types'

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s) || /^[=+\-@]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function AdminCertificatesPage() {
  const { profile } = useAuth()
  const [certs, setCerts] = useState<CertificateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'certificates')).then(snap => {
      setCerts(snap.docs.map(d => d.data() as CertificateRecord))
      setLoading(false)
    })
  }, [])

  const filtered = certs.filter(c =>
    !search ||
    c.nameAtIssuance.toLowerCase().includes(search.toLowerCase()) ||
    c.participantId.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateId.toLowerCase().includes(search.toLowerCase())
  )

  const handleRevoke = async (uid: string, currentStatus: string) => {
    if (!profile) return
    const newStatus = currentStatus === 'issued' ? 'revoked' : 'issued'
    const confirm = window.confirm(
      newStatus === 'revoked'
        ? 'Revoke this certificate? The participant will not be able to generate a new one unless you authorise a replacement.'
        : 'Reinstate this certificate?'
    )
    if (!confirm) return
    setActionLoading(uid)
    setError('')
    try {
      await updateDoc(doc(db, 'certificates', uid), {
        status: newStatus,
        ...(newStatus === 'issued' ? {
          replacementAuthorisedBy: profile.uid,
          replacementAuthorisedAt: new Date().toISOString(),
        } : {}),
      })
      await addDoc(collection(db, 'adminAuditLogs'), {
        actor: profile.uid,
        action: `certificate_${newStatus}`,
        target: uid,
        timestamp: new Date().toISOString(),
      })
      setCerts(prev => prev.map(c => c.uid === uid ? { ...c, status: newStatus as 'issued' | 'revoked' } : c))
      setSuccess(`Certificate ${newStatus} successfully.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('Action failed. Please try again.')
      console.error(e)
    } finally {
      setActionLoading(null) }
  }

  const handleExport = () => {
    const headers = ['certificateId','participantId','nameAtIssuance','issueTimestamp','status','programmeDate','collaboratorName']
    const rows = filtered.map(c => headers.map(h => escapeCsvCell(c[h as keyof CertificateRecord])).join(','))
    const content = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `certificates_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12304A]">Certificates</h1>
          <p className="text-sm text-[#5A6472]">{certs.length} certificate{certs.length !== 1 ? 's' : ''} issued</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={certs.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6472]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, participant ID or certificate ID…"
          className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E7] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-[#DDE3E7]">
          <table className="min-w-full text-sm bg-white">
            <thead className="bg-[#F9FBF9]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Certificate ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Participant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472] hidden md:table-cell">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A6472]">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#5A6472]">
                    <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {certs.length === 0 ? 'No certificates issued yet.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : filtered.map(cert => (
                <tr key={cert.uid} className="hover:bg-[#F9FBF9] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#12304A]">{cert.certificateId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#12304A] text-sm">{cert.nameAtIssuance}</p>
                    <p className="text-xs text-[#5A6472]">{cert.participantId}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5A6472] hidden md:table-cell">
                    {new Date(cert.issueTimestamp).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cert.status === 'issued' ? 'green' : 'red'}>{cert.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost" size="sm"
                      loading={actionLoading === cert.uid}
                      onClick={() => handleRevoke(cert.uid, cert.status)}
                      title={cert.status === 'issued' ? 'Revoke certificate' : 'Reinstate certificate'}
                    >
                      {cert.status === 'issued'
                        ? <ShieldOff className="w-4 h-4 text-[#C62828]" />
                        : <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
