import { Upload, X } from 'lucide-react'
import { Input, Select, Textarea, Card } from './ui'
import { validateImage } from '../lib/cloudinary'
import { CATEGORIES } from '../lib/constants'
import { useObjectUrl } from '../lib/useObjectUrl'
import {
  TOOL_TYPES, USER_TYPES, COST_OPTIONS,
  type ToolFormData, type ToolFormErrors,
} from '../lib/toolForm'

interface Props {
  form: ToolFormData
  setForm: React.Dispatch<React.SetStateAction<ToolFormData>>
  errors: ToolFormErrors
  /** A newly chosen image (not yet uploaded) */
  imageFile: File | null
  /** The image already saved on the entry (admin editing) */
  existingImageUrl?: string | null
  onImageChange: (file: File | null) => void
  onImageError: (message: string) => void
  idPrefix?: string
}

/**
 * The full tool form (every field a contributor can fill in).
 * Shared by the public Contribute page and the Admin edit panel so they never drift apart.
 */
export default function ToolFormFields({
  form, setForm, errors, imageFile, existingImageUrl, onImageChange, onImageError, idPrefix = 'tool',
}: Props) {
  const newPreview = useObjectUrl(imageFile)
  const shownImage = newPreview ?? existingImageUrl ?? null
  const uploadId = `${idPrefix}-image-upload`

  const set = (field: keyof ToolFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const toggleUser = (u: string) =>
    setForm(f => ({
      ...f,
      selectedUsers: f.selectedUsers.includes(u)
        ? f.selectedUsers.filter(x => x !== u)
        : [...f.selectedUsers, u],
    }))

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateImage(file, 2)
    if (err) { onImageError(err); return }
    onImageChange(file)
  }

  return (
    <div className="space-y-6">
      {/* Tool Information */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Tool Information</h2>
        <div className="space-y-4">
          <Input label="Tool Name" required value={form.toolName} onChange={set('toolName')} error={errors.toolName} placeholder="Official name of the platform or app" />
          <Select label="Category" required value={form.category} onChange={set('category')} error={errors.category} placeholder="Select a category" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Select label="Tool Type" required value={form.toolType} onChange={set('toolType')} error={errors.toolType} placeholder="Select tool type" options={TOOL_TYPES.map(t => ({ value: t, label: t }))} />
          <Select label="Cost Type" required value={form.costType} onChange={set('costType')} error={errors.costType} placeholder="Select cost type" options={COST_OPTIONS} />
          <Input label="Pricing Details (optional)" value={form.costDetails} onChange={set('costDetails')} placeholder="e.g. Free for basic access, $49/month for premium tier" />
        </div>
      </Card>

      {/* Description */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Description</h2>
        <div className="space-y-4">
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
        </div>
      </Card>

      {/* Links & Keywords */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#12304A] mb-4 border-b border-[#DDE3E7] pb-2">Links &amp; Discovery</h2>
        <div className="space-y-4">
          <Input label="Official URL (optional)" type="url" value={form.officialUrl} onChange={set('officialUrl')} error={errors.officialUrl} placeholder="https://" />
          <Input label="Keywords (optional)" value={form.keywords} onChange={set('keywords')} hint="Comma-separated. Helps with search." placeholder="e.g. soil moisture, crop monitoring, satellite" />
        </div>
      </Card>

      {/* Image — REQUIRED */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#12304A] mb-1 border-b border-[#DDE3E7] pb-2 flex items-center gap-2">
          Image or Logo
          <span className="text-[10px] uppercase tracking-wide bg-[#FFEBEE] text-[#C62828] px-1.5 py-0.5 rounded font-semibold">Required</span>
        </h2>
        <p className="text-xs text-[#5A6472] mb-4">
          You must upload an image or logo of the tool. JPG, PNG or WebP · max 2 MB.
          {existingImageUrl && ' Choose a new file only if you want to replace the current image.'}
        </p>
        <div className="space-y-3">
          <Select label="Image Type" value={form.imageType} onChange={set('imageType')}
            options={[{ value: 'logo', label: 'Logo (square, transparent background preferred)' }, { value: 'screenshot', label: 'UI Screenshot (16:9 preferred)' }]}
            placeholder="Select image type (optional)" />
          <div>
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleFile} className="sr-only" id={uploadId} />
            <label htmlFor={uploadId}
              className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-[#2E7D32] transition-colors
                ${errors.image ? 'border-[#C62828] bg-[#FFEBEE]/40' : 'border-[#DDE3E7]'}`}>
              {shownImage
                ? <img src={shownImage} alt="Preview" className="max-h-24 object-contain rounded" />
                : <Upload className="w-8 h-8 text-[#5A6472]" />}
              <span className="text-sm text-[#5A6472] text-center">
                {imageFile ? imageFile.name : shownImage ? 'Click to replace image' : 'Click to upload an image or logo (required)'}
              </span>
            </label>
            {imageFile && (
              <button type="button" onClick={() => onImageChange(null)}
                className="mt-1 text-xs text-[#C62828] hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> {existingImageUrl ? 'Cancel new image' : 'Remove image'}
              </button>
            )}
            {errors.image && <p className="text-xs text-[#C62828] mt-1" role="alert">{errors.image}</p>}
          </div>
        </div>
      </Card>

      {/* Contributor Info */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-[#12304A] mb-1 border-b border-[#DDE3E7] pb-2">Contributor Details (Optional &amp; Private)</h2>
        <p className="text-xs text-[#5A6472] mb-4">Used for moderation only — never shown publicly.</p>
        <div className="space-y-4">
          <Input label="Your Name (optional)" value={form.contributorName} onChange={set('contributorName')} />
          <Input label="Organisation (optional)" value={form.contributorOrg} onChange={set('contributorOrg')} />
          <Input label="Contact Email (optional, private)" type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
        </div>
      </Card>
    </div>
  )
}
