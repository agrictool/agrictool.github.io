# RAISSAT Digital Food Systems Platform — Deployment & Admin Guide

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| Git | any | https://git-scm.com |

---

## 1 — Create Firebase Project

1. Go to https://console.firebase.google.com → **Add project**
2. Name it (e.g. `raissat-dfs`) → disable Google Analytics (optional)
3. **Upgrade to Blaze plan** (pay-as-you-go):
   - Console → top-left project name → Spark plan → Upgrade
   - Set a **budget alert** at $5/month to avoid surprise charges
4. Enable services:
   - **Authentication** → Sign-in method → Email/Password → Enable
   - **Firestore Database** → Create database → Start in **production mode** → choose a region close to Nigeria (e.g. `europe-west1`)
   - **Storage** → Get started → production mode
   - **Hosting** → Get started (follow prompts)

---

## 2 — Local Setup

```bash
git clone <your-repo-url>
cd raissat-app
npm install
cp .env.example .env.local
```

Edit `.env.local` with your Firebase project values:

```
# Firebase Console → Project Settings → Your apps → Web app → SDK snippet
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=raissat-dfs.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=raissat-dfs
VITE_FIREBASE_STORAGE_BUCKET=raissat-dfs.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_USE_EMULATORS=false   # set true for local dev with emulators
```

---

## 3 — Deploy Firestore Rules, Indexes and Storage Rules

```bash
firebase login
firebase use --add   # select your project, alias it "production"

# Deploy security rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Verify in Firebase Console:
- Firestore → Rules: should show your ruleset
- Firestore → Indexes: should show 7 composite indexes (they may take a few minutes to build)
- Storage → Rules: should show your storage ruleset

---

## 4 — Bootstrap the First Administrator

This must be run **once**, locally, using a service account key.

### Get service account key
1. Firebase Console → Project Settings → Service Accounts
2. **Generate new private key** → download JSON
3. Store it somewhere **outside the project folder** (e.g. `~/raissat-service-account.json`)
4. **Never commit this file**

### Create the first admin account via the app
1. Deploy the app (Step 5 below) or run it locally
2. Register a normal account at `/register` using the admin's real email
3. Copy the **UID** from Firebase Console → Authentication → Users

### Run bootstrap script
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/raissat-service-account.json"
node scripts/bootstrap-admin.cjs --uid=<THE_ADMIN_UID>
```

Expected output:
```
✓ Custom claim role=admin set for uid: abc123
✓ admins/abc123 document created in Firestore.
✓ users/abc123.role set to admin.
✓ programmeSettings/current seeded with defaults.
✅ Bootstrap complete.
```

**Delete the service account key** after use:
```bash
rm ~/raissat-service-account.json
```

The admin can now log in and access `/admin`.

---

## 5 — Build and Deploy the App

```bash
npm run build       # creates /dist
firebase deploy --only hosting
```

Your app will be live at `https://raissat-dfs.web.app` (or your custom domain).

### Custom domain (optional)
Firebase Console → Hosting → Add custom domain → follow DNS instructions.

---

## 6 — Deploy Everything at Once

```bash
firebase deploy
```

This deploys: hosting, Firestore rules, Firestore indexes, Storage rules.

---

## 7 — Local Development with Emulators

```bash
# Terminal 1
firebase emulators:start

# Terminal 2
VITE_USE_EMULATORS=true npm run dev
```

Emulator UI: http://localhost:4000
App: http://localhost:5173

---

## 8 — Run Security Rules Tests

```bash
# Requires Firebase Emulator running (Firestore only)
firebase emulators:start --only firestore

# In another terminal
npm install --save-dev jest ts-jest --legacy-peer-deps
npx jest --config jest.config.cjs
```

Tests cover: programme settings read/write, user profile access controls,
survey response creation and duplicate prevention, toolkit entry visibility,
certificate eligibility enforcement, audit log append-only, private toolkit data.

---

## 9 — CI/CD with GitHub Actions (optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_USE_EMULATORS: false
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: raissat-dfs
```

Add these secrets to your GitHub repo:
- All `VITE_*` environment variables
- `FIREBASE_SERVICE_ACCOUNT` (the JSON content of a CI-specific service account key)

---

## 10 — Post-Deployment Test Checklist

Run through every item before going live:

### Authentication
- [ ] Register a new participant account — confirm redirect to dashboard
- [ ] Log in with correct credentials — confirm access
- [ ] Log in with wrong password — confirm error message
- [ ] Request password reset — confirm email arrives
- [ ] Navigate to `/dashboard` while logged out — confirm redirect to `/login`
- [ ] Navigate to `/admin` as a participant — confirm redirect to `/dashboard`

### Phase Controls
- [ ] All three phases start as "Not Open" on a fresh deployment
- [ ] Open Pre-Training phase — confirm participants can now see the assessment button
- [ ] Submit pre-assessment — confirm saved; duplicate submission rejected
- [ ] Close Pre-Training phase — confirm new submissions blocked
- [ ] Open and close Post-Training and Certificate phases independently

### Surveys
- [ ] Pre-assessment: all required questions enforced
- [ ] Draft saves on refresh; clears after submission
- [ ] Review step shows all answers before confirm
- [ ] Submission timestamp and participant ID recorded correctly
- [ ] Post-assessment locked until pre is complete (UI check only — phase controls enforce it)

### Toolkit
- [ ] Submit a tool via `/contribute` — confirm appears as "pending" in admin
- [ ] Approve the tool — confirm appears in public `/toolkit` directory without redeploy
- [ ] Reject a tool — confirm removed from public view
- [ ] Search field filters results correctly
- [ ] Image lightbox opens and closes with mouse and Escape key
- [ ] Image proportions preserved (no stretching)
- [ ] Tool detail page shows all fields

### Analytics
- [ ] Counts match Firestore document counts (verify in Firebase Console)
- [ ] Empty state renders cleanly when no data
- [ ] Charts appear when matched pairs exist
- [ ] CSV export opens correctly in Excel (check for UTF-8 BOM, no formula injection)

### Certificates
- [ ] Certificate blocked while any eligibility requirement unmet
- [ ] Eligible participant generates certificate — PDF downloads
- [ ] PDF is A4 landscape, shows correct name, ID, date, and programme title
- [ ] Same certificate ID on every re-download
- [ ] Admin can revoke and reinstate certificate
- [ ] Revoked participant cannot re-generate until admin authorises replacement

### Security
- [ ] Unauthenticated request to `/admin` redirected to `/login`
- [ ] Participant UID cannot read another participant's `/users/{uid}` — test with Firestore REST API
- [ ] Pending toolkit entry not returned by public query — test in browser console
- [ ] No Firebase API key, service account or contributor code in built `/dist` files:
  ```bash
  grep -r "service_account\|private_key" dist/
  ```

---

## 11 — Admin Guide

### Day-to-day Operations

#### Managing Programme Phases
Navigate to `/admin/phases`. The three phases (Pre-Assessment, Post-Assessment, Certificate) are **independent** — opening one does not affect the others.

**Recommended sequence:**
1. Open **Pre-Assessment** 1–2 days before the training event
2. Open **Post-Assessment** immediately after the training concludes
3. Open **Certificate** after reviewing post-assessment data (typically 1–2 days later)

Always close a phase after its purpose is fulfilled — this preserves data integrity.

#### Moderating Toolkit Submissions
Navigate to `/admin/toolkit`. Check the **Pending** tab after each contributor submission.

For each entry:
1. Review tool name, description, category and URL
2. Visit the official URL to verify the tool is real and the description is accurate
3. Note: FarmMap GIS, AgriApp/FarmBee and "AWS/IoT Sensor Dashboards" are flagged for admin review — verify current availability before approving
4. Approve (appears immediately in public directory) or Reject (with optional note)
5. You can edit text, category or cost before approving

#### Issuing and Managing Certificates
Navigate to `/admin/certificates`.

- **Revoke**: removes participant's ability to download. Use for data integrity issues or programme policy violations
- **Reinstate**: re-enables a previously revoked certificate (recorded in audit log)
- Bulk export available as CSV

#### Viewing Impact Analysis
Navigate to `/admin/impact`.

All charts show **self-reported** Likert and familiarity data — this is clearly labelled. The system does not currently have scored knowledge questions (these can be added via questionnaire configuration in `/admin/settings`).

**Matched pairs**: only participants who completed both pre and post assessments appear in comparative analysis. Unmatched records are excluded from paired charts but counted separately.

#### Exporting Data
All exports are available as CSV with UTF-8 BOM (opens correctly in Microsoft Excel):
- `/admin/participants` → participant list
- `/admin/pre-survey` → pre-assessment responses
- `/admin/post-survey` → post-assessment responses
- `/admin/impact` → matched pre/post analysis
- `/admin/certificates` → certificate records

All exports are audit-logged.

#### Updating Settings
Navigate to `/admin/settings`.

Critical fields to update before going live:
- Programme date (default: October 16, 2026)
- Programme location
- Collaborating organisation name
- Project description (shown on homepage)
- Contact email and phone
- Certificate signatory names and titles
- Organisation logos (upload PNG/JPG, max 2 MB)

#### Safe Update Procedure
Before making changes to the live deployment:
1. Test changes on the Firebase Emulator locally
2. Run `npm run build` and verify no TypeScript errors
3. Deploy with `firebase deploy --only hosting` (rules and indexes only if changed)
4. Verify the post-deployment checklist items relevant to your changes

---

## 12 — Firestore Data Model Reference

| Collection | Purpose | Access |
|---|---|---|
| `users/{uid}` | Participant profiles and roles | Participant: own only; Admin: all |
| `admins/{uid}` | Admin role records (Spark fallback) | Admin SDK only (bootstrap script) |
| `participantIds/{id}` | Participant ID reservation | Create: authenticated; Read/Write: Admin |
| `programmeSettings/current` | Programme phases, dates, certificate config | Read: public; Write: Admin |
| `surveyResponses/{uid}_{type}` | Pre/post assessment submissions | Read: own or Admin; Create: phase-gated |
| `questionnaires/{type}/versions/{n}` | Questionnaire schemas | Read: public; Write: Admin |
| `toolkitEntries/{toolId}` | Tool submissions (public fields) | Read approved: public; pending: Admin |
| `toolkitPrivate/{toolId}` | Contributor PII, moderation notes | Admin only |
| `toolkitCategories/{id}` | Category list | Read: public; Write: Admin |
| `certificates/{uid}` | Issued certificates | Read: own or Admin; Create: eligibility-gated |
| `groupChallengeScores/{id}` | Challenge scoring | Admin only |
| `adminAuditLogs/{id}` | Immutable action log | Admin read; append-only |

---

## 13 — Troubleshooting

**"Permission denied" on certificate creation**
→ Check all three eligibility conditions: both surveys submitted, certificate phase open, account active.

**Toolkit images not loading**
→ Verify Storage rules are deployed: `firebase deploy --only storage`
→ Check Storage CORS if images load in console but not browser

**Firestore indexes not ready**
→ Composite indexes can take up to 10 minutes after first deploy. Wait and retry.

**Admin claims not working after bootstrap**
→ The participant must **log out and log back in** to refresh their Firebase auth token with the new custom claim.

**Build fails with "react-is" error**
→ Run `npm install react-is --legacy-peer-deps` then rebuild.
