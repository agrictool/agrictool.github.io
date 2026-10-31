import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { Button, Alert, Spinner } from '../../components/ui'
import { Award, Download, CheckCircle2, Lock } from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { CertificateRecord } from '../../types'

function randomBase36(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}


async function fetchImageDataUrl(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function placeLogo(pdf: any, dataUrl: string, x: number, y: number, w: number, h: number) {
  try {
    const props = pdf.getImageProperties(dataUrl)
    const scale = Math.min(w / props.width, h / props.height)
    const dw = props.width * scale
    const dh = props.height * scale
    pdf.addImage(dataUrl, props.fileType, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  } catch (e) {
    console.error('Could not place logo on certificate', e)
  }
}

function drawCertPDF(
  certRecord: CertificateRecord,
  settings: ReturnType<typeof useSettings>['settings'],
  logos: { raissat: string | null; collaborator: string | null } = { raissat: null, collaborator: null },
): jsPDF {
  const cs = settings.certificateSettings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as any
  const W = 297, H = 210

  // Navy background
  pdf.setFillColor(18, 48, 74)
  pdf.rect(0, 0, W, H, 'F')

  // Subtle dot grid
  pdf.setFillColor(255, 255, 255)
  for (let x = 12; x < W - 10; x += 14) {
    for (let y = 12; y < H - 10; y += 14) {
      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(255, 255, 255)
      pdf.setGState(pdf.GState({ opacity: 0.04 }))
      pdf.rect(x, y, 1.2, 1.2, 'F')
    }
  }
  pdf.setGState(pdf.GState({ opacity: 1 }))

  // Large decorative circles
  pdf.setFillColor(46, 125, 50)
  pdf.setGState(pdf.GState({ opacity: 0.08 }))
  pdf.ellipse(35, 28, 58, 58, 'F')
  pdf.setFillColor(212, 175, 55)
  pdf.ellipse(W - 25, H - 22, 72, 72, 'F')
  pdf.setGState(pdf.GState({ opacity: 1 }))

  // Gold top bar
  pdf.setFillColor(212, 175, 55)
  pdf.rect(0, 0, W, 3, 'F')

  // Green bottom bar
  pdf.setFillColor(46, 125, 50)
  pdf.rect(0, H - 2, W, 2, 'F')

  // ── RAISSAT Logo area (top left) ────────────────────────────────────────────
  if (logos.raissat) {
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(12, 6, 32, 16, 2, 2, 'F')
    placeLogo(pdf, logos.raissat, 13, 7, 30, 14)
  } else {
    pdf.setFillColor(255, 255, 255)
    pdf.setGState(pdf.GState({ opacity: 0.1 }))
    pdf.roundedRect(12, 6, 32, 16, 2, 2, 'F')
    pdf.setGState(pdf.GState({ opacity: 1 }))
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text('RAISSAT', 16, 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(5.5)
    pdf.setTextColor(180, 210, 230)
    pdf.text('Community Impact Project', 16, 18)
  }

  // ── Collaborator logo area (top right) ──────────────────────────────────────
  if (logos.collaborator) {
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(W - 44, 6, 32, 16, 2, 2, 'F')
    placeLogo(pdf, logos.collaborator, W - 43, 7, 30, 14)
  } else {
    pdf.setFillColor(255, 255, 255)
    pdf.setGState(pdf.GState({ opacity: 0.1 }))
    pdf.roundedRect(W - 44, 6, 32, 16, 2, 2, 'F')
    pdf.setGState(pdf.GState({ opacity: 1 }))
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text('FUTA', W - 40, 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(5.5)
    pdf.setTextColor(180, 210, 230)
    pdf.text('Akure, Nigeria', W - 40, 18)
  }

  // ── Certificate title ────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(255, 255, 255)
  pdf.text(cs.titleText, W / 2, 34, { align: 'center' })

  // Gold rule
  pdf.setDrawColor(212, 175, 55)
  pdf.setLineWidth(0.7)
  pdf.line(W / 2 - 60, 39, W / 2 + 60, 39)

  // ── "This is awarded to" ─────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(160, 195, 220)
  pdf.text(cs.awardedToLabel, W / 2, 47, { align: 'center' })

  // ── Recipient name ───────────────────────────────────────────────────────────
  const name = certRecord.nameAtIssuance
  const nameSz = name.length > 38 ? 20 : name.length > 28 ? 24 : 28
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(nameSz)
  pdf.setTextColor(212, 175, 55)
  pdf.text(name, W / 2, 60, { align: 'center' })

  // ── Body ─────────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(180, 205, 225)
  pdf.text(cs.bodyText, W / 2, 72, { align: 'center' })

  // Programme title (two lines)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(255, 255, 255)
  pdf.text('PREPARING THE NEXT GENERATION FOR DIGITAL FOOD SYSTEMS:', W / 2, 80, { align: 'center' })
  pdf.text('AI, DATA AND INNOVATION FROM FARM TO FORK', W / 2, 87, { align: 'center' })

  // Organisation line
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(140, 175, 210)
  const orgText = `Organized by RAISSAT in collaboration with ${certRecord.collaboratorName}`
  pdf.text(orgText, W / 2, 96, { align: 'center', maxWidth: 210 })

  // Topics line
  pdf.setFontSize(6.5)
  pdf.setTextColor(120, 160, 200)
  pdf.text(`Covering: ${cs.coveringTopics}`, W / 2, 104, { align: 'center', maxWidth: 210 })

  // Green accent divider
  pdf.setDrawColor(46, 125, 50)
  pdf.setLineWidth(0.5)
  pdf.line(18, 112, W - 18, 112)

  // ── Signature blocks ──────────────────────────────────────────────────────────
  const sigY = 128
  // Left
  pdf.setDrawColor(100, 130, 155)
  pdf.setLineWidth(0.3)
  pdf.line(18, sigY, 105, sigY)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(255, 255, 255)
  pdf.text(cs.projectLeadName, 18, sigY + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(150, 185, 215)
  pdf.text(cs.projectLeadTitle, 18, sigY + 11)

  // Right
  pdf.line(W - 105, sigY, W - 18, sigY)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(255, 255, 255)
  pdf.text(cs.partnerSignatoryName || '[Partner Signatory]', W - 105, sigY + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(150, 185, 215)
  pdf.text(cs.partnerSignatoryTitle || '[Title / Organisation]', W - 105, sigY + 11)

  // ── Gold seal ─────────────────────────────────────────────────────────────────
  const sx = W - 28, sy = H - 22
  pdf.setFillColor(212, 175, 55)
  pdf.setGState(pdf.GState({ opacity: 0.18 }))
  pdf.ellipse(sx, sy, 14, 14, 'F')
  pdf.setGState(pdf.GState({ opacity: 1 }))
  pdf.setDrawColor(212, 175, 55)
  pdf.setLineWidth(0.9)
  pdf.ellipse(sx, sy, 13, 13, 'S')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(4.5)
  pdf.setTextColor(212, 175, 55)
  pdf.text('COMPLETION', sx, sy + 1, { align: 'center' })
  pdf.text('RAISSAT', sx, sy + 5, { align: 'center' })

  // ── Vertical right-edge metadata ──────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.5)
  pdf.setTextColor(100, 140, 170)
  pdf.text(`${certRecord.programmeDate} · ${certRecord.programmeLocation}`, W - 4, H / 2, { align: 'center', angle: 90 })
  pdf.setFontSize(5)
  pdf.setTextColor(212, 175, 55)
  pdf.text(`ID: ${certRecord.certificateId}`, W - 4, H - 20, { align: 'center', angle: 90 })

  return pdf as unknown as jsPDF
}

export default function CertificatePage() {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [certRecord, setCertRecord] = useState<CertificateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [preComplete, setPreComplete] = useState(false)
  const [postComplete, setPostComplete] = useState(false)

  useEffect(() => {
    if (!profile) return
    async function loadStatus() {
      const [certSnap, preSnap, postSnap] = await Promise.all([
        getDoc(doc(db, 'certificates', profile!.uid)),
        getDoc(doc(db, 'surveyResponses', `${profile!.uid}_pre`)),
        getDoc(doc(db, 'surveyResponses', `${profile!.uid}_post`)),
      ])
      if (certSnap.exists()) setCertRecord(certSnap.data() as CertificateRecord)
      setPreComplete(preSnap.exists())
      setPostComplete(postSnap.exists())
      setLoading(false)
    }
    loadStatus()
  }, [profile])

  const isEligible =
    preComplete && postComplete &&
    settings.certificatePhaseState === 'open' &&
    (!certRecord || certRecord.status === 'issued')

  const generateAndDownload = async (record: CertificateRecord) => {
    const [raissat, collaborator] = await Promise.all([
      fetchImageDataUrl(settings.raiissatLogoUrl),
      fetchImageDataUrl(settings.collaboratorLogoUrl),
    ])
    const pdf = drawCertPDF(record, settings, { raissat, collaborator })
    pdf.save(`Certificate_${record.participantId}_${record.certificateId}.pdf`)
  }

  const handleGenerate = async () => {
    if (!profile || !isEligible) return
    setGenerating(true)
    setError('')
    try {
      let record = certRecord
      if (!record) {
        const certId = `${settings.certificateSettings.idPrefix}-${new Date().getFullYear()}-${randomBase36(6)}`
        const now = new Date().toISOString()
        const newRecord: CertificateRecord = {
          certificateId: certId,
          participantId: profile.participantId,
          uid: profile.uid,
          nameAtIssuance: profile.fullName,
          issueTimestamp: now,
          programmeTitle: settings.programmeTitle,
          programmeDate: settings.programmeDate,
          programmeLocation: settings.programmeLocation,
          collaboratorName: settings.collaboratorName,
          templateVersion: settings.certificateSettings.templateVersion,
          status: 'issued',
        }
        await setDoc(doc(db, 'certificates', profile.uid), newRecord)
        setCertRecord(newRecord)
        record = newRecord
      }
      await generateAndDownload(record)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      if (code === 'permission-denied') {
        setError('Certificate generation was blocked. Ensure both assessments are complete and the certificate phase is open.')
      } else {
        setError('Failed to generate certificate. Please try again.')
        console.error(e)
      }
    } finally {
      setGenerating(false)
    }
  }

  if (!profile) return <Spinner />
  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12"><Spinner /></div>

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 text-center">
        <Award className="w-14 h-14 text-[#D4AF37] mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-[#12304A]">Certificate of Completion</h1>
        <p className="text-sm text-[#5A6472] mt-1 max-w-md mx-auto">{settings.programmeTitle}</p>
      </div>

      {error && <div className="mb-5"><Alert variant="error">{error}</Alert></div>}

      {certRecord?.status === 'revoked' && (
        <div className="mb-5">
          <Alert variant="error" title="Certificate Revoked">
            Your certificate has been revoked. Please contact the project administrator.
          </Alert>
        </div>
      )}

      {certRecord?.status === 'issued' && (
        <div className="bg-white border border-[#DDE3E7] rounded-xl p-6 mb-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#2E7D32] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#12304A]">Certificate Issued</p>
              <p className="text-sm text-[#5A6472] mt-1">
                Certificate ID: <span className="font-mono text-[#12304A]">{certRecord.certificateId}</span>
              </p>
              <p className="text-sm text-[#5A6472]">
                Issued: {new Date(certRecord.issueTimestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="primary" loading={generating}
              onClick={() => { setGenerating(true); generateAndDownload(certRecord).finally(() => setGenerating(false)) }}>
              <Download className="w-4 h-4" /> Download Certificate
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#DDE3E7] rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#12304A] mb-3">Eligibility Requirements</h2>
        {[
          { label: 'Pre-Training Assessment completed', met: preComplete },
          { label: 'Post-Training Assessment completed', met: postComplete },
          { label: 'Certificate phase is open', met: settings.certificatePhaseState === 'open' },
        ].map(req => (
          <div key={req.label} className="flex items-center gap-3 text-sm">
            {req.met
              ? <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              : <Lock className="w-4 h-4 text-[#5A6472] flex-shrink-0" />}
            <span className={req.met ? 'text-[#12304A]' : 'text-[#5A6472]'}>{req.label}</span>
          </div>
        ))}
      </div>

      {!certRecord && (
        <div className="mt-6">
          {isEligible ? (
            <Button variant="primary" size="lg" loading={generating} onClick={handleGenerate} className="w-full">
              <Award className="w-5 h-5" />
              {generating ? 'Generating Certificate…' : 'Generate & Download Certificate'}
            </Button>
          ) : (
            <div className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-xl p-4 text-center text-sm text-[#5A6472]">
              Complete all requirements above to generate your certificate.
            </div>
          )}
        </div>
      )}
    </main>
  )
}
