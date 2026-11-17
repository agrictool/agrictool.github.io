import type { ToolkitEntry, ToolkitPrivate } from '../types'

export const TOOL_TYPES = ['Mobile App', 'GIS', 'Software/Web Platform', 'Digital Equipment', 'Data Analysis Tool']

export const USER_TYPES = [
  'Students', 'Farmers', 'Researchers', 'Agronomists', 'Food Scientists',
  'Veterinarians', 'Extension Officers', 'Food Processors',
  'Laboratory Technicians', 'Agribusiness Managers', 'Policymakers', 'Other',
]

export const COST_OPTIONS = [
  { value: 'Free',     label: 'Free — core functionality available without payment' },
  { value: 'Freemium', label: 'Freemium — basic free, advanced features paid' },
  { value: 'Premium',  label: 'Premium — subscription, licence or purchase required' },
]

export interface ToolFormData {
  toolName: string; category: string; costType: string; costDetails: string
  functionDesc: string; selectedUsers: string[]; toolType: string
  officialUrl: string; useCase: string; keywords: string
  imageType: 'logo' | 'screenshot' | ''
  contributorName: string; contributorOrg: string; contactEmail: string
}

export type ToolFormErrors = Partial<Record<keyof ToolFormData | 'image', string>>

export const EMPTY_TOOL_FORM: ToolFormData = {
  toolName: '', category: '', costType: '', costDetails: '',
  functionDesc: '', selectedUsers: [], toolType: '',
  officialUrl: '', useCase: '', keywords: '',
  imageType: '', contributorName: '', contributorOrg: '', contactEmail: '',
}

export function toolFormFromEntry(entry: ToolkitEntry, priv?: ToolkitPrivate): ToolFormData {
  return {
    toolName: entry.toolName ?? '',
    category: entry.category ?? '',
    costType: entry.costType ?? '',
    costDetails: entry.costDetails ?? '',
    functionDesc: entry.function ?? '',
    selectedUsers: entry.users ?? [],
    toolType: entry.toolType ?? '',
    officialUrl: entry.officialUrl ?? '',
    useCase: entry.useCase ?? '',
    keywords: (entry.keywords ?? []).join(', '),
    imageType: entry.imageType ?? '',
    contributorName: priv?.contributorName ?? '',
    contributorOrg: priv?.contributorOrg ?? '',
    contactEmail: priv?.contactEmail ?? '',
  }
}

export function parseKeywords(raw: string): string[] {
  return raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
}

/** hasImage = a new file was chosen OR the entry already has a saved image. */
export function validateToolForm(form: ToolFormData, hasImage: boolean): ToolFormErrors {
  const e: ToolFormErrors = {}
  if (!form.toolName.trim())     e.toolName     = 'Tool name is required.'
  if (!form.category)            e.category     = 'Category is required.'
  if (!form.costType)            e.costType     = 'Cost type is required.'
  if (!form.functionDesc.trim()) e.functionDesc = 'Please describe what the tool does.'
  if (form.functionDesc.length > 500) e.functionDesc = 'Keep this under 500 characters.'
  if (!form.toolType)            e.toolType     = 'Tool type is required.'
  if (form.officialUrl && !/^https?:\/\/.+/.test(form.officialUrl))
    e.officialUrl = 'Please enter a valid URL starting with http:// or https://'
  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
    e.contactEmail = 'Please enter a valid email address.'
  if (!hasImage) e.image = 'An image or logo is required. Please upload one before continuing.'
  return e
}
