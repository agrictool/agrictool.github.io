/**
 * RAISSAT — Admin Bootstrap Script
 * Run ONCE locally with a service-account key to set the first administrator.
 * Never commit this script with a real service account key.
 * Never run this in a public CI environment.
 *
 * Usage:
 *   node scripts/bootstrap-admin.cjs --uid=<FIREBASE_USER_UID>
 *
 * Prerequisites:
 *   npm install firebase-admin (dev dependency only)
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, OR
 *   set FIREBASE_SERVICE_ACCOUNT to the JSON content as an env var.
 */

'use strict'

const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=')
  acc[k] = v
  return acc
}, {})

const uid = args['uid']
if (!uid) {
  console.error('ERROR: --uid=<UID> is required.')
  process.exit(1)
}

async function bootstrap() {
  let serviceAccount
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }

  initializeApp(serviceAccount
    ? { credential: cert(serviceAccount) }
    : undefined // Uses GOOGLE_APPLICATION_CREDENTIALS
  )

  const auth = getAuth()
  const db = getFirestore()

  // 1. Set custom claim (primary approach — Blaze plan)
  try {
    await auth.setCustomUserClaims(uid, { role: 'admin' })
    console.log(`✓ Custom claim role=admin set for uid: ${uid}`)
  } catch (err) {
    console.warn('Could not set custom claim (may need Blaze plan):', err.message)
    console.log('Falling back to Firestore admins collection…')
  }

  // 2. Also write to Firestore admins collection (Spark fallback)
  await db.collection('admins').doc(uid).set({
    role: 'admin',
    grantedAt: new Date().toISOString(),
    grantedBy: 'bootstrap-script',
  })
  console.log(`✓ admins/${uid} document created in Firestore.`)

  // 3. Update users/{uid} role field
  try {
    await db.collection('users').doc(uid).update({
      role: 'admin',
      updatedAt: new Date().toISOString(),
    })
    console.log(`✓ users/${uid}.role set to admin.`)
  } catch {
    console.warn(`users/${uid} may not exist yet — create the account first, then re-run.`)
  }

  // 4. Seed initial programmeSettings/current if it doesn't exist
  const settingsRef = db.collection('programmeSettings').doc('current')
  const snap = await settingsRef.get()
  if (!snap.exists) {
    await settingsRef.set({
      preSurveyState: 'not_open',
      postSurveyState: 'not_open',
      certificatePhaseState: 'not_open',
      programmeTitle: 'Preparing the Next Generation for Digital Food Systems: AI, Data, and Innovation from Farm to Fork',
      programmeDate: 'October 16, 2026',
      programmeLocation: 'Akure, Nigeria',
      collaboratorName: 'Federal University of Technology, Akure (FUTA), School of Agriculture and Agricultural Technology (SAAT)',
      requireGroupScoreForCertificate: false,
      projectDescription: '',
      projectObjectives: [],
      certificateSettings: {
        titleText: 'CERTIFICATE OF COMPLETION',
        awardedToLabel: 'THIS IS AWARDED TO',
        bodyText: 'For successfully participating in and completing the capacity-building project and training:',
        coveringTopics: 'Precision Agriculture, AI Diagnostics, GIS & Remote Sensing, Food Traceability, Laboratory Data Systems, and Practical Problem-Solving Challenges.',
        projectLeadName: 'Oladipo Esther Modupe',
        projectLeadTitle: 'Project Lead, RAISSAT Community Impact Project',
        partnerSignatoryName: '',
        partnerSignatoryTitle: '',
        idPrefix: 'DFS',
        templateVersion: 1,
        backgroundColour: '#12304A',
        accentColour: '#2E7D32',
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'bootstrap-script',
    })
    console.log('✓ programmeSettings/current seeded with defaults.')
  } else {
    console.log('— programmeSettings/current already exists; skipping seed.')
  }

  console.log('\n✅ Bootstrap complete. The user can now log in and access /admin.')
  console.log('   IMPORTANT: Delete or revoke the service account key if it is no longer needed.')
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
