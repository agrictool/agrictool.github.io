import { useEffect, useState, useCallback, useMemo } from 'react'
import { collection, getDocs, getDoc, doc, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Badge, Button, Alert, Card, Spinner } from '../../components/ui'
import { Download, Eye, EyeOff, KeyRound } from 'lucide-react'
import { MAX_REGISTRATIONS, hashCode } from '../../lib/invite'
import type { UserProfile } from '../../types'

interface Row {
  hash: string
  code: string
  used: boolean
  usedAt?: string
  user?: UserProfile
}

function csvCell(v: unknown): string {
  let s = String(v ?? '')
  if (/^[=+\-@]/.test(s)) s = `'${s}`           // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, headers: string[], lines: unknown[][]) {
  const body = [headers, ...lines].map(r => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—')

export default function AdminInvitesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [counter, setCounter] = useState<number | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCodes, setShowCodes] = useState(false)
  const [seedText, setSeedText] = useState('')
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    try {
      const [secrets, invites, users, ctr] = await Promise.all([
        getDocs(collection(db, 'inviteCodeSecrets')),
        getDocs(collection(db, 'inviteCodes')),
        getDocs(collection(db, 'users')),
        getDoc(doc(db, 'registrationCounter', 'state')),
      ])
      const inviteMap = new Map(invites.docs.map(d => [d.id, d.data() as { used: boolean; usedAt?: string }]))
      const userList = users.docs.map(d => d.data() as UserProfile)
      const byHash = new Map(userList.filter(u => u.inviteCodeHash).map(u => [u.inviteCodeHash as string, u]))
      const list: Row[] = secrets.docs.map(d => {
        const inv = inviteMap.get(d.id)
        return {
          hash: d.id,
          code: (d.data() as { code: string }).code,
          used: !!inv?.used,
          usedAt: inv?.usedAt,
          user: byHash.get(d.id),
        }
      })
      list.sort((a, b) => a.code.localeCompare(b.code))
      setRows(list)
      setAllUsers(userList)
      setCounter(ctr.exists() ? (ctr.data().count as number) : null)
      setError('')
    } catch (e) {
      console.error(e)
      setError('Could not load invitation data. Publish the latest firestore.rules and check that your account is in the admins collection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const total = rows.length
    const used = rows.filter(r => r.used).length
    const registrations = counter ?? used
    const invited = rows.filter(r => r.user).map(r => r.user as UserProfile)
    return {
      total, used, unused: total - used, registrations,
      remaining: Math.max(0, MAX_REGISTRATIONS - registrations),
      male: invited.filter(u => u.gender === 'Male').length,
      female: invited.filter(u => u.gender === 'Female').length,
    }
  }, [rows, counter])

  const parsed = useMemo(
    () => Array.from(new Set(seedText.split(/[\s,;]+/).filter(t => /^[A-Z]{6}$/.test(t)))),
    [seedText],
  )

  const handleSeed = async () => {
    setError(''); setSuccess('')
    if (parsed.length !== MAX_REGISTRATIONS) {
      setError(`Found ${parsed.length} valid codes. Exactly ${MAX_REGISTRATIONS} unique six-letter UPPERCASE codes are required.`)
      return
    }
    setSeeding(true)
    try {
      const existing = new Set(rows.map(r => r.hash))
      const items = await Promise.all(parsed.map(async code => ({ code, hash: await hashCode(code) })))
      const todo = items.filter(i => !existing.has(i.hash))
      const now = new Date().toISOString()
      // Small batches keep every write inside Firestore's rule-evaluation limits
      for (let i = 0; i < todo.length; i += 4) {
        const batch = writeBatch(db)
        for (const { code, hash } of todo.slice(i, i + 4)) {
          batch.set(doc(db, 'inviteCodes', hash), { used: false, createdAt: now })
          batch.set(doc(db, 'inviteCodeSecrets', hash), { code, createdAt: now })
        }
        await batch.commit()
      }
      // Creating the counter opens registration and permanently locks further seeding
      if (counter === null) await setDoc(doc(db, 'registrationCounter', 'state'), { count: 0 })
      setSeedText('')
      setSuccess(`${todo.length} invitation codes saved securely. Registration is now open (invitation-only, maximum ${MAX_REGISTRATIONS}).`)
      await load()
    } catch (e) {
      console.error(e)
      setError(`Seeding failed (${(e as { code?: string }).code ?? 'unknown error'}). Nothing is lost — fix the problem and click Save again; codes already saved are skipped.`)
    } finally {
      setSeeding(false)
    }
  }

  const exportRegistrations = () => {
    const codeByHash = new Map(rows.map(r => [r.hash, r.code]))
    const people = allUsers.filter(u => u.role === 'participant')
    downloadCsv(
      `registrations_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Participant ID', 'Full Name', 'Email', 'Phone', 'Gender', 'Department', 'Level', 'Invitation Code', 'Registered At', 'Account Status'],
      people.map(u => [
        u.participantId, u.fullName, u.email, u.phone ?? '', u.gender ?? '', u.department, u.academicLevel,
        u.inviteCodeHash ? codeByHash.get(u.inviteCodeHash) ?? '' : '', u.createdAt, u.accountStatus,
      ]),
    )
  }

  const exportCodes = () => {
    downloadCsv(
      `invitation_codes_${new Date().toISOString().slice(0, 10)}.csv`,
      ['No', 'Invitation Code', 'Status', 'Used At', 'Registered Name', 'Email', 'Gender'],
      rows.map((r, i) => [i + 1, r.code, r.used ? 'USED' : 'UNUSED', r.usedAt ?? '', r.user?.fullName ?? '', r.user?.email ?? '', r.user?.gender ?? '']),
    )
  }

  if (loading) return <div className="p-6"><Spinner label="Loading…" /></div>

  const needsSeeding = rows.length === 0 || counter === null

  return (
    <main className="w-full max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-[#12304A] mb-1 flex items-center gap-2">
        <KeyRound className="w-5 h-5" /> Invitation Codes &amp; Registration
      </h1>
      <p className="text-sm text-[#5A6472] mb-5">
        Registration is invitation-only: each of the {MAX_REGISTRATIONS} codes works once, and registration closes
        automatically after the {MAX_REGISTRATIONS}th successful registration.
      </p>

      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      {needsSeeding && (
        <Card className="p-5 mb-6">
          <h2 className="text-sm font-bold text-[#12304A] mb-1">Step 1 — Save the {MAX_REGISTRATIONS} invitation codes</h2>
          <p className="text-xs text-[#5A6472] mb-3">
            Paste the full list of codes (one per line; numbers beside them are fine). They are hashed in your browser and
            stored in the database — never in the website files. Until you do this, nobody can register.
          </p>
          <textarea
            value={seedText}
            onChange={e => setSeedText(e.target.value)}
            rows={8}
            placeholder={'01  ABCDEF\n02  GHJKMN\n…'}
            className="w-full border border-[#DDE3E7] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
          />
          <p className={`text-xs mt-1 ${parsed.length === MAX_REGISTRATIONS ? 'text-[#2E7D32]' : 'text-[#5A6472]'}`}>
            {parsed.length} valid unique code(s) found{parsed.length === MAX_REGISTRATIONS ? ' — ready to save.' : ` — ${MAX_REGISTRATIONS} needed.`}
          </p>
          <div className="mt-3">
            <Button variant="primary" loading={seeding} disabled={parsed.length !== MAX_REGISTRATIONS} onClick={handleSeed}>
              Save codes &amp; open registration
            </Button>
          </div>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          ['Codes generated', stats.total],
          ['Used', stats.used],
          ['Unused', stats.unused],
          ['Registrations', stats.registrations],
          ['Slots remaining', stats.remaining],
          ['Male / Female', `${stats.male} / ${stats.female}`],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-3 text-center">
            <p className="text-xl font-bold text-[#12304A]">{value}</p>
            <p className="text-[11px] text-[#5A6472] mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => setShowCodes(s => !s)}>
          {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showCodes ? 'Hide codes' : 'Show codes'}
        </Button>
        <Button variant="primary" size="sm" onClick={exportRegistrations}>
          <Download className="w-4 h-4" /> Export registrations (with gender)
        </Button>
        <Button variant="outline" size="sm" onClick={exportCodes} disabled={rows.length === 0}>
          <Download className="w-4 h-4" /> Export code status
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FBF9]">
            <tr>
              {['#', 'Code', 'Status', 'Used at', 'Registered user', 'Gender'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[#5A6472] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE3E7]">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-[#5A6472] text-sm">No codes saved yet.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.hash}>
                <td className="px-3 py-2 text-xs text-[#5A6472]">{i + 1}</td>
                <td className="px-3 py-2 font-mono tracking-widest text-[#12304A]">{showCodes ? r.code : '••••••'}</td>
                <td className="px-3 py-2"><Badge variant={r.used ? 'gold' : 'green'}>{r.used ? 'USED' : 'UNUSED'}</Badge></td>
                <td className="px-3 py-2 text-xs text-[#5A6472] whitespace-nowrap">{fmt(r.usedAt)}</td>
                <td className="px-3 py-2 text-xs">
                  {r.user ? (<><p className="font-medium text-[#12304A]">{r.user.fullName}</p><p className="text-[#5A6472]">{r.user.email}</p></>) : '—'}
                </td>
                <td className="px-3 py-2 text-xs">{r.user?.gender ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
