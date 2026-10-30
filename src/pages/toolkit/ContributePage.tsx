import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { uploadToCloudinary, validateImage } from '../../lib/cloudinary'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Textarea, Button, Alert, Card } from '../../components/ui'
import { Upload, X, CheckCircle2, PlusCircle } from 'lucide-react'
import { CATEGORIES } from '../../lib/constants'

const TOOL_TYPES = ['Mobile App','GIS','Software/Web Platform','Digital Equipment','Data Analysis Tool']
const USER_TYPES = [
  'Students','Farmers','Researchers','Agronomists','Food Scientists',
  'Veterinarians','Extension Officers','Food Processors',
  'Laboratory Technicians','Agribusiness Managers','Policymakers','Other',
]
const COST_OPTIONS = [
  { value: 'Free',     label: 'Free — core functionality available without payment' },
  { value: 'Freemium', label: 'Freemium — basic free, advanced features paid' },
  { value: 'Premium',  label: 'Premium — subscription, licence or purchase required' },
]

interface FormData {
  toolName: string; category: string; costType: string; costDetails: string
  functionDesc: string; selectedUsers: string[]; toolType: string
  officialUrl: string; useCase: string; keywords: string
  imageType: 'logo' | 'screenshot' | ''
  contributorName: string; contributorOrg: string; contactEmail: string
}

const EMPTY: FormData = {
  toolName:'', category:'', costType:'', costDetails:'',
  functionDesc:'', selectedUsers:[], toolType:'',
  officialUrl:'', useCase:'', keywords:'',
  imageType:'', contributorName:'', contributorOrg:'', contactEmail:'',
}

export default function ContributePage() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'image', string>>>({})
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [submissionRef, setSubmissionRef] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const toggleUser = (u: string) => {
    setForm(f => ({
      ...f,
      selectedUsers: f.selectedUsers.includes(u)
        ? f.selectedUsers.filter(x => x !== u)
        : [...f.selectedUsers, u],
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImage(file, 2)
    if (err) { setErrors(er => ({ ...er, image: err })); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setErrors(er => ({ ...er, image: undefined }))
  }

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.toolName.trim())      e.toolName     = 'Tool name is required.'
    if (!form.category)             e.category     = 'Category is required.'
    if (!form.costType)             e.costType     = 'Cost type is required.'
    if (!form.functionDesc.trim())  e.functionDesc = 'Please describe what the tool does.'
    if (form.functionDesc.length > 500) e.functionDesc = 'Keep this under 500 characters.'
    if (!form.toolType)             e.toolType     = 'Tool type is required.'
    if (form.officialUrl && !/^https?:\/\/.+/.test(form.officialUrl))
      e.officialUrl = 'Please enter a valid URL starting with http:// or https://'
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
      e.contactEmail = 'Please enter a valid email address.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePreview = () => {
    if (validate()) setStep('preview')
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setServerError('')
    try {
      const toolId = doc(collection(db, 'toolkitEntries')).id
      let imageUrl = ''
      let imagePublicId = ''

      if (imageFile) {
        const result = await uploadToCloudinary(
          imageFile,
          'toolkit-images',
          `${toolId}_${form.imageType || 'image'}`,
        )
        imageUrl      = result.url
        imagePublicId = result.publicId
      }

      const now      = new Date().toISOString()
      const keywords = form.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)

      await setDoc(doc(db, 'toolkitEntries', toolId), {
        toolName:    form.toolName.trim(),
        category:    form.category,
        costType:    form.costType,
        costDetails: form.costDetails.trim(),
        function:    form.functionDesc.trim(),
        users:       form.selectedUsers,
        toolType:    form.toolType,
        imageUrl,
        imagePublicId: imagePublicId || null,
        imageType:   form.imageType || null,
        officialUrl: form.officialUrl.trim() || null,
        useCase:     form.useCase.trim() || null,
        keywords,
        status:      'pending',
        submittedAt: now,
        updatedAt:   now,
      })

      if (form.contributorName || form.contributorOrg || form.contactEmail) {
        await setDoc(doc(db, 'toolkitPrivate', toolId), {
          contributorName: form.contributorName.trim() || null,
          contributorOrg:  form.contributorOrg.trim()  || null,
          contactEmail:    form.contactEmail.trim()     || null,
          moderationNote: null, reviewedBy: null, reviewedAt: null,
        })
      }

      setSubmissionRef(toolId.slice(0, 8).toUpperCase())
      setStep('done')
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'Submission failed.'
      const code = (e as { code?: string }).code
      setServerError(
        msg.includes('Cloudinary')
          ? `Image upload failed: ${msg}`
          : code === 'permission-denied'
            ? 'The database rejected this submission (permission denied). Please contact the administrator.'
            : `Submission failed (${code ?? msg}). Please try again.`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-[#DDE3E7] rounded-xl p-8 shadow-sm">
          <CheckCircle2 className="w-14 h-14 text-[#2E7D32] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#12304A] mb-2">Tool Submitted!</h1>
          <p className="text-[#5A6472] mb-1">Your submission is under review.</p>
          <p className="text-sm text-[#5A6472] mb-6">
            Reference: <strong className="font-mono text-[#12304A]">{submissionRef}</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={() => {
              setForm(EMPTY); setImageFile(null); setImagePreview(null); setStep('form')
            }}>
              <PlusCircle className="w-4 h-4" /> Submit Another Tool
            </Button>
            <Button variant="outline" onClick={() => navigate('/toolkit')}>
              Explore the Toolkit
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const isPreview = step === 'preview'

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#12304A]">Contribute a Digital Tool</h1>
        <p className="text-sm text-[#5A6472] mt-1">
          Help build the Digital Food Systems Toolkit. All submissions are reviewed before appearing publicly.
        </p>
      </div>

      {!firebaseUser && (
        <div className="mb-6">
          <Alert variant="info">
            You do not need an account to submit a tool.
          </Alert>
        </div>
      )}
      {serverError && <div className="mb-5"><Alert variant="error">{serverError}</Alert></div>}
      {isPreview && (
        <div className="mb-5">
          <Alert variant="info" title="Review your submission">
            Check all fields before confirming. Your tool will be saved as pending for moderator review.
          </Alert>
        </div>
      )}

      <div className="space-y-6">
        {/* Tool Information */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Tool Information</h2>
          <div className="space-y-4">
            {isPreview ? (
              <>
                <Preview label="Tool Name"  value={form.toolName} />
                <Preview label="Category"   value={form.category} />
                <Preview label="Tool Type"  value={form.toolType} />
                <Preview label="Cost"       value={`${form.costType}${form.costDetails ? ` — ${form.costDetails}` : ''}`} />
              </>
            ) : (
              <>
                <Input label="Tool Name" required value={form.toolName} onChange={set('toolName')} error={errors.toolName} placeholder="Official name of the platform or app" />
                <Select label="Category" required value={form.category} onChange={set('category')} error={errors.category} placeholder="Select a category" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                <Select label="Tool Type" required value={form.toolType} onChange={set('toolType')} error={errors.toolType} placeholder="Select tool type" options={TOOL_TYPES.map(t => ({ value: t, label: t }))} />
                <Select label="Cost Type" required value={form.costType} onChange={set('costType')} error={errors.costType} placeholder="Select cost type" options={COST_OPTIONS} />
                <Input label="Pricing Details (optional)" value={form.costDetails} onChange={set('costDetails')} placeholder="e.g. Free for basic access, $49/month for premium tier" />
              </>
            )}
          </div>
        </Card>

        {/* Description */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Description</h2>
          <div className="space-y-4">
            {isPreview ? (
              <>
                <Preview label="What It Does" value={form.functionDesc} />
                <Preview label="Who Uses It"  value={form.selectedUsers.join(', ') || 'Not specified'} />
                {form.useCase && <Preview label="Use Case" value={form.useCase} />}
              </>
            ) : (
              <>
                <Textarea label="What It Does" required value={form.functionDesc} onChange={set('functionDesc')} error={errors.functionDesc} hint="1–2 student-friendly sentences. Maximum 500 characters." placeholder="Describe the tool's main function in plain language…" />
                <div>
                  <p className="text-sm font-medium text-[#12304A] mb-2">Who Uses It</p>
                  <div className="flex flex-wrap gap-2">
                    {USER_TYPES.map(u => (
                      <button key={u} type="button" onClick={() => toggleUser(u)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors
                          ${form.selectedUsers.includes(u)
                            ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                            : 'bg-white text-[#374151] border-[#DDE3E7] hover:border-[#2E7D32]'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea label="Use Case (optional)" value={form.useCase} onChange={set('useCase')} placeholder="Describe a specific use case…" />
              </>
            )}
          </div>
        </Card>

        {/* Links & Keywords */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Links & Discovery</h2>
          <div className="space-y-4">
            {isPreview ? (
              <>
                {form.officialUrl && (
                  <div>
                    <p className="text-xs text-[#5A6472] mb-0.5">Official URL</p>
                    <a href={form.officialUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E7D32] underline">{form.officialUrl}</a>
                  </div>
                )}
                {form.keywords && <Preview label="Keywords" value={form.keywords} />}
              </>
            ) : (
              <>
                <Input label="Official URL (optional)" type="url" value={form.officialUrl} onChange={set('officialUrl')} error={errors.officialUrl} placeholder="https://" />
                <Input label="Keywords (optional)" value={form.keywords} onChange={set('keywords')} hint="Comma-separated. Helps with search." placeholder="e.g. soil moisture, crop monitoring, satellite" />
              </>
            )}
          </div>
        </Card>

        {/* Image */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-[#12304A] mb-1 border-b border-[#DDE3E7] pb-2">Image</h2>
          <p className="text-xs text-[#5A6472] mb-4">
            JPG, PNG or WebP · max 2 MB · uploaded to Cloudinary (free image hosting)
          </p>
          {isPreview ? (
            imagePreview
              ? <div>
                  <p className="text-xs text-[#5A6472] mb-2">Preview ({form.imageType || 'image'})</p>
                  <img src={imagePreview} alt="Tool preview" className="max-h-32 rounded border border-[#DDE3E7] object-contain" />
                </div>
              : <p className="text-sm text-[#5A6472]">No image submitted.</p>
          ) : (
            <div className="space-y-3">
              <Select label="Image Type" value={form.imageType} onChange={set('imageType')}
                options={[{ value: 'logo', label: 'Logo (square, transparent background preferred)' }, { value: 'screenshot', label: 'UI Screenshot (16:9 preferred)' }]}
                placeholder="Select image type (optional)" />
              <div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect} className="sr-only" id="image-upload" />
                <label htmlFor="image-upload"
                  className="flex flex-col items-center gap-2 border-2 border-dashed border-[#DDE3E7] rounded-lg p-6 cursor-pointer hover:border-[#2E7D32] transition-colors">
                  {imagePreview
                    ? <img src={imagePreview} alt="Preview" className="max-h-24 object-contain rounded" />
                    : <Upload className="w-8 h-8 text-[#5A6472]" />}
                  <span className="text-sm text-[#5A6472]">
                    {imageFile ? imageFile.name : 'Click to upload'}
                  </span>
                </label>
                {imagePreview && (
                  <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="mt-1 text-xs text-[#C62828] hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove image
                  </button>
                )}
                {errors.image && <p className="text-xs text-[#C62828] mt-1">{errors.image}</p>}
              </div>
            </div>
          )}
        </Card>

        {/* Contributor Info */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-[#12304A] mb-1 border-b border-[#DDE3E7] pb-2">Contributor Details (Optional & Private)</h2>
          <p className="text-xs text-[#5A6472] mb-4">Used for moderation only — never shown publicly.</p>
          {isPreview ? (
            <div className="space-y-2">
              {form.contributorName && <Preview label="Name" value={form.contributorName} />}
              {form.contributorOrg  && <Preview label="Organisation" value={form.contributorOrg} />}
              {form.contactEmail    && <Preview label="Email (private)" value={form.contactEmail} />}
              {!form.contributorName && !form.contributorOrg && !form.contactEmail &&
                <p className="text-sm text-[#5A6472]">No contributor details provided.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="Your Name (optional)" value={form.contributorName} onChange={set('contributorName')} />
              <Input label="Organisation (optional)" value={form.contributorOrg} onChange={set('contributorOrg')} />
              <Input label="Contact Email (optional, private)" type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          {!isPreview
            ? <Button variant="primary" size="lg" onClick={handlePreview}>Preview Before Submitting</Button>
            : <>
                <Button variant="outline" size="lg" onClick={() => setStep('form')}>Edit</Button>
                <Button variant="primary" size="lg" loading={submitting} onClick={handleSubmit}>
                  {submitting ? 'Uploading & Submitting…' : 'Confirm & Submit Tool'}
                </Button>
              </>
          }
        </div>
      </div>
    </main>
  )
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#5A6472] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[#12304A]">{value || '—'}</p>
    </div>
  )
}
