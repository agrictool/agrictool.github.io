/**
 * Invitation-code helpers.
 *
 * The real codes are NEVER stored in the website's source. In the database each code is
 * stored under the document ID = SHA-256 hash of the code (collection `inviteCodes`), and
 * the readable code lives only in `inviteCodeSecrets`, which only administrators can read.
 */

export const MAX_REGISTRATIONS = 60
export const CODE_LENGTH = 6

export const INVITE_MESSAGES = {
  invalid: 'Invalid invitation code. Please enter a valid registration code.',
  used: 'This invitation code has already been used. Please provide an unused code.',
  closed: 'Registration is now closed. The maximum number of 60 registrations has been reached. Thank you for your interest.',
  notReady: 'Registration has not opened yet. Please check back soon.',
} as const

/** Upper-case, letters only, max 6 characters (used while the person types). */
export function cleanCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH)
}

export function isValidCodeFormat(code: string): boolean {
  return /^[A-Z]{6}$/.test(code)
}

/** SHA-256 (hex) of the code, with an app-specific prefix. */
export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(`raissat-invite:v1:${code}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Light client-side throttle for wrong guesses ─────────────────────────────
// This only slows down people using the page. The real protection is the database rules
// (single-use codes + hard cap of 60).
const KEY = 'raissat_invite_attempts'
const MAX_WRONG = 5
const LOCK_MS = 5 * 60 * 1000

interface AttemptState { count: number; lockedUntil: number }

function readAttempts(): AttemptState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AttemptState
  } catch { /* ignore */ }
  return { count: 0, lockedUntil: 0 }
}

function writeAttempts(s: AttemptState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** Milliseconds left on a temporary lock (0 = not locked). */
export function getLockRemainingMs(): number {
  return Math.max(0, readAttempts().lockedUntil - Date.now())
}

export function recordWrongAttempt() {
  const s = readAttempts()
  const count = s.count + 1
  writeAttempts(count >= MAX_WRONG
    ? { count: 0, lockedUntil: Date.now() + LOCK_MS }
    : { count, lockedUntil: s.lockedUntil })
}

export function clearAttempts() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
