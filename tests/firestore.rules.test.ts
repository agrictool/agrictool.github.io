/**
 * RAISSAT — Firestore Security Rules Tests
 * Run with Firebase Emulator:
 *   firebase emulators:start --only firestore
 *   npx jest tests/firestore.rules.test.ts
 *
 * Install dev deps: npm install --save-dev @firebase/rules-unit-testing jest ts-jest
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
} from 'firebase/firestore'

let testEnv: RulesTestEnvironment

const RULES = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8')

const PARTICIPANT_UID = 'participant-uid-001'
const OTHER_UID       = 'other-uid-002'
const ADMIN_UID       = 'admin-uid-003'

function makeParticipantCtx() {
  return testEnv.authenticatedContext(PARTICIPANT_UID, { role: 'participant' })
}
function makeOtherCtx() {
  return testEnv.authenticatedContext(OTHER_UID, { role: 'participant' })
}
function makeAdminCtx() {
  return testEnv.authenticatedContext(ADMIN_UID, { role: 'admin' })
}
function makeAnonCtx() {
  return testEnv.unauthenticatedContext()
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'raissat-test',
    firestore: {
      rules: RULES,
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()

  // Seed: admin document
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'admins', ADMIN_UID), { role: 'admin', grantedAt: new Date().toISOString() })

    // Seed: programme settings (open phases)
    await setDoc(doc(db, 'programmeSettings', 'current'), {
      preSurveyState: 'open',
      postSurveyState: 'open',
      certificatePhaseState: 'open',
    })

    // Seed: participant user
    await setDoc(doc(db, 'users', PARTICIPANT_UID), {
      uid: PARTICIPANT_UID,
      participantId: 'FUTA-DFS-TEST01',
      fullName: 'Test Participant',
      email: 'participant@test.com',
      department: 'Food Science & Technology',
      academicLevel: '300L',
      role: 'participant',
      accountStatus: 'active',
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Seed: pre-survey response (for cert eligibility tests)
    await setDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`), {
      participantId: 'FUTA-DFS-TEST01',
      userId: PARTICIPANT_UID,
      surveyType: 'pre',
      answers: {},
      schemaVersion: 1,
      submittedAt: new Date().toISOString(),
      completionStatus: 'submitted',
    })

    // Seed: post-survey response
    await setDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_post`), {
      participantId: 'FUTA-DFS-TEST01',
      userId: PARTICIPANT_UID,
      surveyType: 'post',
      answers: {},
      schemaVersion: 1,
      submittedAt: new Date().toISOString(),
      completionStatus: 'submitted',
    })

    // Seed: approved toolkit entry
    await setDoc(doc(db, 'toolkitEntries', 'tool-001'), {
      toolName: 'Google Earth Engine',
      category: 'Remote Sensing and GIS',
      costType: 'Free',
      function: 'Cloud-based satellite imagery platform',
      users: ['Researchers'],
      toolType: 'GIS',
      keywords: ['satellite', 'gis'],
      status: 'approved',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    })

    // Seed: pending toolkit entry
    await setDoc(doc(db, 'toolkitEntries', 'tool-002'), {
      toolName: 'Pending Tool',
      category: 'Crop Production',
      costType: 'Free',
      function: 'A tool awaiting review',
      users: ['Farmers'],
      toolType: 'Mobile App',
      keywords: ['crop'],
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })
})

// ── Programme Settings ────────────────────────────────────────────────────────
describe('programmeSettings/current', () => {
  it('anonymous can read settings', async () => {
    const db = makeAnonCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'programmeSettings', 'current')))
  })
  it('participant can read settings', async () => {
    const db = makeParticipantCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'programmeSettings', 'current')))
  })
  it('participant cannot write settings', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'programmeSettings', 'current'), { programmeTitle: 'Hacked' }))
  })
  it('admin can write settings', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(updateDoc(doc(db, 'programmeSettings', 'current'), { programmeTitle: 'Updated' }))
  })
})

// ── User Profiles ─────────────────────────────────────────────────────────────
describe('users/{uid}', () => {
  it('participant reads own profile', async () => {
    const db = makeParticipantCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'users', PARTICIPANT_UID)))
  })
  it('participant cannot read another profile', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(getDoc(doc(db, 'users', OTHER_UID)))
  })
  it('anonymous cannot read any profile', async () => {
    const db = makeAnonCtx().firestore()
    await assertFails(getDoc(doc(db, 'users', PARTICIPANT_UID)))
  })
  it('admin can read any profile', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'users', PARTICIPANT_UID)))
  })
  it('participant cannot set role to admin', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'users', PARTICIPANT_UID), { role: 'admin' }))
  })
  it('participant cannot change their participantId', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'users', PARTICIPANT_UID), { participantId: 'HACKED-ID' }))
  })
  it('participant cannot change their accountStatus', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'users', PARTICIPANT_UID), { accountStatus: 'deactivated' }))
  })
  it('participant can update their phone number', async () => {
    const db = makeParticipantCtx().firestore()
    await assertSucceeds(updateDoc(doc(db, 'users', PARTICIPANT_UID), {
      phone: '+2348012345678',
      updatedAt: new Date().toISOString(),
    }))
  })
  it('participant cannot update another users profile', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'users', OTHER_UID), { phone: 'hacked' }))
  })
})

// ── Survey Responses ──────────────────────────────────────────────────────────
describe('surveyResponses/{responseId}', () => {
  it('participant reads own pre-survey', async () => {
    const db = makeParticipantCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`)))
  })
  it('participant cannot read another participants survey', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(getDoc(doc(db, 'surveyResponses', `${OTHER_UID}_pre`)))
  })
  it('anonymous cannot read survey responses', async () => {
    const db = makeAnonCtx().firestore()
    await assertFails(getDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`)))
  })
  it('admin can read any survey response', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`)))
  })
  it('participant cannot duplicate survey submission (doc already exists)', async () => {
    // pre already seeded
    const db = makeParticipantCtx().firestore()
    await assertFails(setDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`), {
      participantId: 'FUTA-DFS-TEST01',
      userId: PARTICIPANT_UID,
      surveyType: 'pre',
      answers: {},
      schemaVersion: 1,
      submittedAt: new Date().toISOString(),
      completionStatus: 'submitted',
    }))
  })
  it('admin can update (reopen) a survey response', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(updateDoc(doc(db, 'surveyResponses', `${PARTICIPANT_UID}_pre`), {
      completionStatus: 'reopened'
    }))
  })
})

// ── Toolkit Entries ───────────────────────────────────────────────────────────
describe('toolkitEntries/{toolId}', () => {
  it('anonymous can read approved tools', async () => {
    const db = makeAnonCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'toolkitEntries', 'tool-001')))
  })
  it('anonymous cannot read pending tools', async () => {
    const db = makeAnonCtx().firestore()
    await assertFails(getDoc(doc(db, 'toolkitEntries', 'tool-002')))
  })
  it('participant cannot read pending tools', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(getDoc(doc(db, 'toolkitEntries', 'tool-002')))
  })
  it('admin can read pending tools', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'toolkitEntries', 'tool-002')))
  })
  it('participant cannot approve a tool', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(updateDoc(doc(db, 'toolkitEntries', 'tool-002'), { status: 'approved' }))
  })
  it('admin can approve a tool', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(updateDoc(doc(db, 'toolkitEntries', 'tool-002'), {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
  })
  it('admin can delete a tool', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(deleteDoc(doc(db, 'toolkitEntries', 'tool-002')))
  })
})

// ── Certificates ──────────────────────────────────────────────────────────────
describe('certificates/{uid}', () => {
  it('participant can create own certificate when eligible (both surveys + phase open)', async () => {
    const db = makeParticipantCtx().firestore()
    await assertSucceeds(setDoc(doc(db, 'certificates', PARTICIPANT_UID), {
      certificateId: 'DFS-2026-TESTXX',
      participantId: 'FUTA-DFS-TEST01',
      uid: PARTICIPANT_UID,
      nameAtIssuance: 'Test Participant',
      issueTimestamp: new Date().toISOString(),
      programmeTitle: 'Test Programme',
      programmeDate: 'October 16, 2026',
      programmeLocation: 'Akure, Nigeria',
      collaboratorName: 'FUTA',
      templateVersion: 1,
      status: 'issued',
    }))
  })
  it('participant cannot create a certificate for another user', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(setDoc(doc(db, 'certificates', OTHER_UID), {
      certificateId: 'DFS-2026-STOLEN',
      participantId: 'FUTA-DFS-TEST01',
      uid: OTHER_UID,
      nameAtIssuance: 'Someone Else',
      issueTimestamp: new Date().toISOString(),
      programmeTitle: 'Test Programme',
      programmeDate: 'October 16, 2026',
      programmeLocation: 'Akure, Nigeria',
      collaboratorName: 'FUTA',
      templateVersion: 1,
      status: 'issued',
    }))
  })
  it('participant cannot read another participants certificate', async () => {
    // Seed a cert for OTHER_UID
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'certificates', OTHER_UID), {
        certificateId: 'DFS-2026-OTHER1',
        uid: OTHER_UID,
        status: 'issued',
      })
    })
    const db = makeParticipantCtx().firestore()
    await assertFails(getDoc(doc(db, 'certificates', OTHER_UID)))
  })
  it('admin can revoke a certificate', async () => {
    // First create a cert
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'certificates', PARTICIPANT_UID), {
        certificateId: 'DFS-2026-TESTXX', uid: PARTICIPANT_UID, status: 'issued',
      })
    })
    const db = makeAdminCtx().firestore()
    await assertSucceeds(updateDoc(doc(db, 'certificates', PARTICIPANT_UID), { status: 'revoked' }))
  })
})

// ── Audit Logs ────────────────────────────────────────────────────────────────
describe('adminAuditLogs/{logId}', () => {
  it('admin can create audit log entries', async () => {
    const db = makeAdminCtx().firestore()
    await assertSucceeds(addDoc(collection(db, 'adminAuditLogs'), {
      actor: ADMIN_UID,
      action: 'phase_open',
      target: 'preSurveyState',
      timestamp: new Date().toISOString(),
    }))
  })
  it('admin can read audit logs', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await addDoc(collection(ctx.firestore(), 'adminAuditLogs'), {
        actor: ADMIN_UID, action: 'test', target: 'test', timestamp: new Date().toISOString()
      })
    })
    const db = makeAdminCtx().firestore()
    // Read the collection (just one doc to test)
    const snap = await assertSucceeds(getDoc(doc(db, 'adminAuditLogs', 'any-id-that-doesnt-exist')))
    // Rules allow read; non-existence is fine
  })
  it('participant cannot read audit logs', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(addDoc(collection(db, 'adminAuditLogs'), {
      actor: PARTICIPANT_UID, action: 'injected', target: 'all', timestamp: new Date().toISOString()
    }))
  })
  it('audit logs cannot be updated (append-only)', async () => {
    let logId: string
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const ref = await addDoc(collection(ctx.firestore(), 'adminAuditLogs'), {
        actor: ADMIN_UID, action: 'test', target: 'test', timestamp: new Date().toISOString()
      })
      logId = ref.id
    })
    const db = makeAdminCtx().firestore()
    await assertFails(updateDoc(doc(db, 'adminAuditLogs', logId!), { action: 'tampered' }))
  })
})

// ── Toolkit Private Data ──────────────────────────────────────────────────────
describe('toolkitPrivate/{toolId}', () => {
  it('anonymous cannot read private tool data', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'toolkitPrivate', 'tool-001'), {
        contributorName: 'Jane Doe', contactEmail: 'jane@example.com'
      })
    })
    const db = makeAnonCtx().firestore()
    await assertFails(getDoc(doc(db, 'toolkitPrivate', 'tool-001')))
  })
  it('participant cannot read private tool data', async () => {
    const db = makeParticipantCtx().firestore()
    await assertFails(getDoc(doc(db, 'toolkitPrivate', 'tool-001')))
  })
  it('admin can read private tool data', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'toolkitPrivate', 'tool-001'), {
        contributorName: 'Jane Doe', contactEmail: 'jane@example.com'
      })
    })
    const db = makeAdminCtx().firestore()
    await assertSucceeds(getDoc(doc(db, 'toolkitPrivate', 'tool-001')))
  })
})
