import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Button, Alert, Input, Textarea } from '../../components/ui'
import { Save, Upload, Settings2 } from 'lucide-react'

export default function AdminSettingsPage() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  // Local form state initialised from live settings
  const [form, setForm] = useState({
    programmeTitle: settings.programmeTitle,
    programmeDate: settings.programmeDate,
    programmeLocation: settings.programmeLocation,
    collaboratorName: settings.collaboratorName,
    projectDescription: settings.projectDescription,
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    // Certificate settings
    projectLeadName: settings.certificateSettings.projectLeadName,
    projectLeadTitle: settings.certificateSettings.projectLeadTitle,
    partnerSignatoryName: settings.certificateSettings.partnerSignatoryName,
    partnerSignatoryTitle: settings.certificateSettings.partnerSignatoryTitle,
    idPrefix: settings.certificateSettings.idPrefix,
    coveringTopics: settings.certificateSettings.coveringTopics,
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const now = new Date().toISOString()
      await updateDoc(doc(db, 'programmeSettings', 'current'), {
        programmeTitle: form.programmeTitle,
        programmeDate: form.programmeDate,
        programmeLocation: form.programmeLocation,
        collaboratorName: form.collaboratorName,
        projectDescription: form.projectDescription,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        'certificateSettings.projectLeadName': form.projectLeadName,
        'certificateSettings.projectLeadTitle': form.projectLeadTitle,
        'certificateSettings.partnerSignatoryName': form.partnerSignatoryName,
        'certificateSettings.partnerSignatoryTitle': form.partnerSignatoryTitle,
        'certificateSettings.idPrefix': form.idPrefix,
        'certificateSettings.coveringTopics': form.coveringTopics,
        updatedAt: now,
        updatedBy: profile.uid,
      })
      setSuccess('Settings saved successfully.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError('Failed to save settings. Please try again.')
      console.error(e)
    } finally {
      setSaving(false) }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, logoKey: string) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setError('Logo must be JPG, PNG or WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB.'); return }
    setUploading(logoKey)
    try {
      const ext = file.name.split('.').pop()
      const storageRef = ref(storage, `settings/${logoKey}.${ext}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, 'programmeSettings', 'current'), {
        [`${logoKey}Url`]: url,
        updatedAt: new Date().toISOString(),
        updatedBy: profile.uid,
      })
      setSuccess(`${logoKey === 'raiissatLogo' ? 'RAISSAT' : 'Collaborator'} logo uploaded.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#12304A]">Settings</h1>
        <p className="text-sm text-[#5A6472]">Configure programme details, logos, and certificate information.</p>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Programme Details */}
      <section className="bg-white border border-[#DDE3E7] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#12304A] border-b border-[#DDE3E7] pb-2 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#2E7D32]" /> Programme Details
        </h2>
        <Input label="Programme Title" value={form.programmeTitle} onChange={set('programmeTitle')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Programme Date" value={form.programmeDate} onChange={set('programmeDate')} required placeholder="e.g. October 16, 2026" />
          <Input label="Programme Location" value={form.programmeLocation} onChange={set('programmeLocation')} required />
        </div>
        <Input label="Collaborating Organisation" value={form.collaboratorName} onChange={set('collaboratorName')} required />
        <Textarea label="Project Description" value={form.projectDescription} onChange={set('projectDescription')}
          hint="Shown on the public homepage." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Contact Email (public)" type="email" value={form.contactEmail} onChange={set('contactEmail')} />
          <Input label="Contact Phone (public)" value={form.contactPhone} onChange={set('contactPhone')} />
        </div>
      </section>

      {/* Logos */}
      <section className="bg-white border border-[#DDE3E7] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#12304A] border-b border-[#DDE3E7] pb-2 flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#2E7D32]" /> Organisation Logos
        </h2>
        <p className="text-xs text-[#5A6472]">
          Logos appear on the homepage and certificate. Preferred: square PNG with transparent background.
          Max 2 MB. JPG, PNG, WebP accepted.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'raiissatLogo', label: 'RAISSAT Logo', currentUrl: settings.raiissatLogoUrl },
            { key: 'collaboratorLogo', label: 'Collaborator Logo', currentUrl: settings.collaboratorLogoUrl },
          ].map(logo => (
            <div key={logo.key} className="border border-[#DDE3E7] rounded-lg p-4">
              <p className="text-xs font-medium text-[#12304A] mb-2">{logo.label}</p>
              {logo.currentUrl ? (
                <img src={logo.currentUrl} alt={logo.label}
                  className="w-16 h-16 object-contain border border-[#DDE3E7] rounded mb-2" />
              ) : (
                <div className="w-16 h-16 bg-[#F9FBF9] border border-dashed border-[#DDE3E7] rounded flex items-center justify-center mb-2">
                  <span className="text-xs text-[#5A6472]">No logo</span>
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={e => handleLogoUpload(e, logo.key)}
                  className="sr-only" />
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#2E7D32] text-[#2E7D32] rounded hover:bg-[#E8F5E9] transition-colors
                  ${uploading === logo.key ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-3 h-3" />
                  {uploading === logo.key ? 'Uploading…' : 'Upload Logo'}
                </span>
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Certificate Settings */}
      <section className="bg-white border border-[#DDE3E7] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#12304A] border-b border-[#DDE3E7] pb-2 flex items-center gap-2">
          Certificate Settings
        </h2>
        <Input label="Project Lead Name" value={form.projectLeadName} onChange={set('projectLeadName')} required />
        <Input label="Project Lead Title" value={form.projectLeadTitle} onChange={set('projectLeadTitle')} required />
        <Input label="Partner Signatory Name" value={form.partnerSignatoryName} onChange={set('partnerSignatoryName')} />
        <Input label="Partner Signatory Title / Organisation" value={form.partnerSignatoryTitle} onChange={set('partnerSignatoryTitle')} />
        <Input label="Certificate ID Prefix" value={form.idPrefix} onChange={set('idPrefix')}
          hint="Appears before the year and random suffix, e.g. DFS → DFS-2026-K7M4QX" />
        <Textarea label="Covering Topics Text" value={form.coveringTopics} onChange={set('coveringTopics')}
          hint="Appears on the certificate below the programme title." />
      </section>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
          <Save className="w-4 h-4" /> Save All Settings
        </Button>
      </div>
    </div>
  )
}
