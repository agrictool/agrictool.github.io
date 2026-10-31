import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { uploadToCloudinary, validateImage } from '../../lib/cloudinary'
import { Button, Alert, Input, Select, Card, Spinner } from '../../components/ui'
import OrgCard from '../../components/OrgCard'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Partner, PartnerType } from '../../types'

const TYPES: PartnerType[] = ['Collaborator', 'Contributing Organisation']

export default function AdminCollaboratorsPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [type, setType] = useState<PartnerType>('Collaborator')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'collaborators'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner))
      list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      setPartners(list)
    } catch (e) {
      console.error(e)
      setError('Could not load organisations. Check that your account is listed in the admins collection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const showError = (e: unknown, fallback: string) => {
    console.error(e)
    const code = (e as { code?: string }).code
    const msg = e instanceof Error ? e.message : ''
    setError(
      code === 'permission-denied'
        ? 'Blocked by database rules. Publish the latest firestore.rules and check the admins collection.'
        : msg.includes('Cloudinary') ? msg : `${fallback}${code ? ` (${code})` : ''}`,
    )
  }

  const handleAdd = async () => {
    setError(''); setSuccess('')
    if (!name.trim()) { setError('Please enter the organisation name.'); return }
    if (file) {
      const v = validateImage(file, 2)
      if (v) { setError(v); return }
    }
    setSaving(true)
    try {
      let logoUrl = ''
      if (file) {
        const result = await uploadToCloudinary(file, 'partners', `partner-${Date.now()}`)
        logoUrl = result.url
      }
      await addDoc(collection(db, 'collaborators'), {
        name: name.trim(),
        type,
        logoUrl,
        createdAt: new Date().toISOString(),
      })
      setName(''); setType('Collaborator'); setFile(null); setFileKey(k => k + 1)
      setSuccess('Organisation added.')
      await load()
    } catch (e) {
      showError(e, 'Could not add the organisation')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeLogo = async (p: Partner, f: File | undefined) => {
    if (!f) return
    setError(''); setSuccess('')
    const v = validateImage(f, 2)
    if (v) { setError(v); return }
    setBusyId(p.id)
    try {
      const result = await uploadToCloudinary(f, 'partners', `partner-${Date.now()}`)
      await updateDoc(doc(db, 'collaborators', p.id), { logoUrl: result.url })
      setSuccess(`Logo updated for ${p.name}.`)
      await load()
    } catch (e) {
      showError(e, 'Could not update the logo')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (p: Partner) => {
    if (!window.confirm(`Remove "${p.name}" from the website?`)) return
    setError(''); setSuccess('')
    setBusyId(p.id)
    try {
      await deleteDoc(doc(db, 'collaborators', p.id))
      setSuccess(`${p.name} removed.`)
      await load()
    } catch (e) {
      showError(e, 'Could not remove the organisation')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="w-full max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-[#12304A] mb-1">Collaborators &amp; Contributing Organisations</h1>
      <p className="text-sm text-[#5A6472] mb-5">
        Add organisations and their logos. They appear on the homepage and in the website footer.
        The main RAISSAT and lead collaborator logos are still set under Settings.
      </p>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#12304A] mb-3">Add an organisation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Organisation name" required value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Federal University of Technology, Akure"
          />
          <Select
            label="Role" value={type}
            onChange={e => setType(e.target.value as PartnerType)}
            options={TYPES.map(t => ({ value: t, label: t }))}
          />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-[#12304A] mb-1">Logo (optional)</p>
          <p className="text-xs text-[#5A6472] mb-2">Square PNG with transparent background works best. Max 2 MB.</p>
          <input
            key={fileKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={handleAdd} loading={saving}>
            <Plus className="w-4 h-4" /> Add organisation
          </Button>
        </div>
      </Card>

      <h2 className="text-sm font-semibold text-[#12304A] mb-3">Current organisations</h2>
      {loading ? (
        <Spinner label="Loading…" />
      ) : partners.length === 0 ? (
        <p className="text-sm text-[#5A6472]">None added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {partners.map(p => (
            <Card key={p.id} className="p-4 flex flex-col items-center gap-3">
              <OrgCard name={p.name} logoUrl={p.logoUrl} caption={p.type} />
              <div className="flex gap-2 flex-wrap justify-center">
                <label className={`cursor-pointer ${busyId === p.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={e => { handleChangeLogo(p, e.target.files?.[0]); e.target.value = '' }}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#2E7D32] text-[#2E7D32] rounded hover:bg-[#E8F5E9]">
                    <Upload className="w-3 h-3" /> {busyId === p.id ? 'Working…' : 'Change logo'}
                  </span>
                </label>
                <Button variant="danger" size="sm" disabled={busyId === p.id} onClick={() => handleDelete(p)}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
