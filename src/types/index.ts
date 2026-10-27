// ── Phase state ──────────────────────────────────────────────────────────────
export type PhaseState = 'not_open' | 'open' | 'closed'

// ── User / Participant ────────────────────────────────────────────────────────
export type UserRole = 'participant' | 'admin'

export type Department =
  | 'Agricultural & Resource Economics'
  | 'Agricultural Extension & Communication Technology'
  | 'Animal Production & Health'
  | 'Crop, Soil & Pest Management'
  | 'Fisheries & Aquaculture Technology'
  | 'Food Science & Technology'
  | 'Forestry & Wood Technology'
  | 'Eco-Tourism & Wildlife Management'

export type AcademicLevel = '100L' | '200L' | '300L' | '400L' | '500L'

export interface UserProfile {
  uid: string
  participantId: string
  fullName: string
  email: string
  phone?: string
  department: Department
  academicLevel: AcademicLevel
  role: UserRole
  consentAt: string
  createdAt: string
  updatedAt: string
  accountStatus: 'active' | 'deactivated'
  contributorApproved?: boolean
}

// ── Programme Settings ────────────────────────────────────────────────────────
export interface ProgrammeSettings {
  preSurveyState: PhaseState
  postSurveyState: PhaseState
  certificatePhaseState: PhaseState
  programmeTitle: string
  programmeDate: string
  programmeLocation: string
  collaboratorName: string
  requireGroupScoreForCertificate: boolean
  projectDescription: string
  projectObjectives: string[]
  contactEmail?: string
  contactPhone?: string
  raiissatLogoUrl?: string
  collaboratorLogoUrl?: string
  certificateSettings: CertificateSettings
  updatedAt: string
  updatedBy: string
}

export interface CertificateSettings {
  titleText: string
  awardedToLabel: string
  bodyText: string
  coveringTopics: string
  projectLeadName: string
  projectLeadTitle: string
  partnerSignatoryName: string
  partnerSignatoryTitle: string
  partnerSignatureUrl?: string
  idPrefix: string
  templateVersion: number
  backgroundColour: string
  accentColour: string
}

// ── Survey ────────────────────────────────────────────────────────────────────
export type QuestionType =
  | 'single-select'
  | 'multi-select'
  | 'likert'
  | 'matrix'
  | 'text'
  | 'paragraph'
  | 'readonly'

export interface QuestionOption {
  value: string
  label: string
}

export interface MatrixRow {
  id: string
  label: string
}

export interface Question {
  id: string
  type: QuestionType
  section: string
  sectionTitle: string
  text: string
  options?: QuestionOption[]
  matrixRows?: MatrixRow[]
  matrixScale?: QuestionOption[]
  required: boolean
  maxSelections?: number
  charLimit?: number
  prefillFrom?: keyof UserProfile
  adminReviewNote?: string
}

export interface QuestionnaireSchema {
  id: 'pre' | 'post'
  schemaVersion: number
  title: string
  subtitle: string
  estimatedMinutes: number
  questions: Question[]
  createdAt: string
  updatedAt: string
}

export interface SurveyResponse {
  participantId: string
  userId: string
  surveyType: 'pre' | 'post'
  answers: Record<string, unknown>
  schemaVersion: number
  submittedAt: string
  completionStatus: 'submitted'
}

// ── Toolkit ───────────────────────────────────────────────────────────────────
export type CostType = 'Free' | 'Freemium' | 'Premium'
export type ToolStatus = 'pending' | 'approved' | 'rejected'
export type ImageType = 'logo' | 'screenshot'
export type ToolType =
  | 'Mobile App'
  | 'GIS'
  | 'Software/Web Platform'
  | 'Digital Equipment'
  | 'Data Analysis Tool'

export interface ToolkitEntry {
  id: string
  toolName: string
  category: string
  costType: CostType
  costDetails: string
  function: string
  users: string[]
  toolType: ToolType
  imageUrl?: string
  imageType?: ImageType
  officialUrl?: string
  useCase?: string
  keywords: string[]
  status: ToolStatus
  submittedAt: string
  updatedAt: string
  approvedAt?: string
}

export interface ToolkitPrivate {
  contributorName?: string
  contributorOrg?: string
  contactEmail?: string
  moderationNote?: string
  reviewedBy?: string
  reviewedAt?: string
}

// ── Certificate ───────────────────────────────────────────────────────────────
export type CertificateStatus = 'issued' | 'revoked'

export interface CertificateRecord {
  certificateId: string
  participantId: string
  uid: string
  nameAtIssuance: string
  issueTimestamp: string
  programmeTitle: string
  programmeDate: string
  programmeLocation: string
  collaboratorName: string
  templateVersion: number
  status: CertificateStatus
  replacementAuthorisedBy?: string
  replacementAuthorisedAt?: string
}

// ── Group Challenge ───────────────────────────────────────────────────────────
export interface CriterionScore {
  problemIdentification: number
  toolSelection: number
  applicationLogic: number
  feasibilityCosting: number
  presentationClarity: number
}

export interface GroupChallengeScore {
  id: string
  groupId: string
  groupLabel: string
  participantIds?: string[]
  criterionScores: CriterionScore
  totalScore: number
  facilitator: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string
  actor: string
  action: string
  target: string
  timestamp: string
  metadata?: Record<string, string | number | boolean>
}
