import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Alert, Card } from '../../components/ui'
import ToolFormFields from '../../components/ToolFormFields'
import { CheckCircle2, PlusCircle } from 'lucide-react'
import { useObjectUrl } from '../../lib/useObjectUrl'
import {
  EMPTY_TOOL_FORM, parseKeywords, validateToolForm,
  type ToolFormData, type ToolFormErrors,
} from '../../lib/toolForm'

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Submitted { ref: string; name: string }

export default function ContributePage() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<ToolFormData>(EMPTY_TOOL_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<ToolFormErrors>({})
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [submitted, setSubmitted] = useState<Submitted[]>([])
  const imagePreview = useObjectUrl(imageFile)

  const toolNumber = submitted.length + 1          // the tool being filled in right now
  const nextWord = ordinal(submitted.length + 1)   // used on the "done" screen

  const handlePreview = () => {
    const e = validateToolForm(form, !!imageFile)
    setErrors(e)
    if (Object.keys(e).length === 0) setStep('preview')
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!imageFile) {
      setErrors(er => ({ ...er, image: 'An image or logo is required. Please upload one before submitting.' }))
      setStep('form')
      return
    }
    setSubmitting(true)
    setServerError('')
    try {
      const toolId = doc(collection(db, 'toolkitEntries')).id
      const result = await uploadToCloudinary(imageFile, 'toolkit-images', `${toolId}_${form.imageType || 'image'}`)
      const now = new Date().toISOString()

      await setDoc(doc(db, 'toolkitEntries', toolId), {
        toolName:    form.toolName.trim(),
        category:    form.category,
        costType:    form.costType,
        costDetails: form.costDetails.trim(),
        function:    form.functionDesc.trim(),
        users:       form.selectedUsers,
        toolType:    form.toolType,
        imageUrl:    result.url,
        imagePublicId: result.publicId || null,
        imageType:   form.imageType || null,
        officialUrl: form.officialUrl.trim() || null,
        useCase:     form.useCase.trim() || null,
        keywords:    parseKeywords(form.keywords),
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

      setSubmitted(list => [...list, { ref: toolId.slice(0, 8).toUpperCase(), name: form.toolName.trim() }])
      setStep('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  /** Start the next tool right away. Contributor details are kept so they don't retype them. */
  const startNext = () => {
    setForm(f => ({
      ...EMPTY_TOOL_FORM,
      contributorName: f.contributorName,
      contributorOrg: f.contributorOrg,
      contactEmail: f.contactEmail,
    }))
    setImageFile(null)
    setErrors({})
    setServerError('')
    setStep('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (step === 'done') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-[#DDE3E7] rounded-xl p-8 shadow-sm">
          <CheckCircle2 className="w-14 h-14 text-[#2E7D32] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#12304A] mb-2">Submitted Successfully!</h1>
          <p className="text-lg text-[#12304A] mb-1">
            Kindly proceed to submit a {nextWord} one.
          </p>
          <p className="text-sm text-[#5A6472] mb-6">
            Your submission is under review. You have submitted <strong>{submitted.length}</strong> so far.
          </p>

          <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={startNext}>
            <PlusCircle className="w-5 h-5" /> Submit {capitalise(nextWord)} One
          </Button>

          <div className="mt-6 text-left bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg p-4">
            <p className="text-xs font-semibold text-[#12304A] mb-2">Submitted in this session</p>
            <ol className="space-y-1 text-sm text-[#374151]">
              {submitted.map((s, i) => (
                <li key={s.ref}>
                  {i + 1}. {s.name} <span className="font-mono text-xs text-[#5A6472]">({s.ref})</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            onClick={() => navigate('/toolkit')}
            className="mt-5 text-sm text-[#5A6472] underline hover:text-[#12304A]"
          >
            I'm finished — explore the Toolkit
          </button>
        </div>
      </main>
    )
  }

  const isPreview = step === 'preview'

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#12304A]">
          Contribute a Digital Tool{submitted.length > 0 && <span className="text-[#2E7D32]"> — {capitalise(ordinal(toolNumber))} one</span>}
        </h1>
        <p className="text-sm text-[#5A6472] mt-1">
          Help build the Digital Food Systems Toolkit. All submissions are reviewed before appearing publicly.
        </p>
      </div>

      {submitted.length > 0 && (
        <div className="mb-6">
          <Alert variant="success">
            {submitted.length === 1 ? 'Your first tool was' : `Your previous ${submitted.length} tools were`} submitted successfully.
            You are now submitting your {ordinal(toolNumber)} one.
          </Alert>
        </div>
      )}
      {!firebaseUser && submitted.length === 0 && (
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

      {!isPreview ? (
        <ToolFormFields
          form={form}
          setForm={setForm}
          errors={errors}
          imageFile={imageFile}
          onImageChange={file => { setImageFile(file); if (file) setErrors(er => ({ ...er, image: undefined })) }}
          onImageError={msg => setErrors(er => ({ ...er, image: msg }))}
          idPrefix="contribute"
        />
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Tool Information</h2>
            <div className="space-y-4">
              <Preview label="Tool Name" value={form.toolName} />
              <Preview label="Category" value={form.category} />
              <Preview label="Tool Type" value={form.toolType} />
              <Preview label="Cost" value={`${form.costType}${form.costDetails ? ` — ${form.costDetails}` : ''}`} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Description</h2>
            <div className="space-y-4">
              <Preview label="What It Does" value={form.functionDesc} />
              <Preview label="Who Uses It" value={form.selectedUsers.join(', ') || 'Not specified'} />
              {form.useCase && <Preview label="Use Case" value={form.useCase} />}
              {form.officialUrl && (
                <div>
                  <p className="text-xs text-[#5A6472] mb-0.5">Official URL</p>
                  <a href={form.officialUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2E7D32] underline">{form.officialUrl}</a>
                </div>
              )}
              {form.keywords && <Preview label="Keywords" value={form.keywords} />}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Image or Logo</h2>
            {imagePreview && (
              <img src={imagePreview} alt="Tool preview" className="max-h-32 rounded border border-[#DDE3E7] object-contain" />
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Contributor Details (Private)</h2>
            <div className="space-y-2">
              {form.contributorName && <Preview label="Name" value={form.contributorName} />}
              {form.contributorOrg && <Preview label="Organisation" value={form.contributorOrg} />}
              {form.contactEmail && <Preview label="Email (private)" value={form.contactEmail} />}
              {!form.contributorName && !form.contributorOrg && !form.contactEmail &&
                <p className="text-sm text-[#5A6472]">No contributor details provided.</p>}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6">
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
