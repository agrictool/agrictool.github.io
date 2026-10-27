# RAISSAT Digital Food Systems Platform — Architecture Note
Prepared: 23 October 2026 | Stage 1

## 1. Plan and Quota Assessment

### Firebase Blaze (Pay-As-You-Go) — Selected
Required because the following features are **not available on Spark (free)**:
- **Cloud Functions**: needed for server-side participant ID generation, contributor code verification, and certificate eligibility enforcement.
- **Firebase Storage**: needed for toolkit tool images (logos and screenshots).
- **App Check**: available on both plans but enforcement only meaningful with Functions.

Budget alert recommended: set at ₦5,000 / $5 USD/month. At typical project scale (< 200 participants, < 500 toolkit entries), actual Firestore and Storage costs will be near zero.

### Quotas relevant to this project
| Service | Free tier (Spark) | Blaze generous tier | Our expected use |
|---|---|---|---|
| Firestore reads | 50k/day | $0.06/100k | < 5k/day |
| Firestore writes | 20k/day | $0.18/100k | < 500/day |
| Storage | 5 GB | $0.026/GB | < 500 MB |
| Functions invocations | N/A (Spark) | 2M free/month | < 1k/month |
| Auth users | Unlimited | Unlimited | ~200 |
| Hosting | 10 GB/month | $0.026/GB | < 1 GB |

## 2. Security-Critical Operations

### Administrator Role Assignment
**Primary (Blaze)**: Custom claim set by a one-time local bootstrap script using the Admin SDK. The script (`scripts/bootstrap-admin.cjs`) is run once locally with a service account key (never committed). The key is added to `.gitignore`.

**Spark fallback**: Manually create `admins/{uid}` document in the Firebase Console. Firestore rules use `get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin'` to grant privileges.

**Never**: Role set via a UI form, email match, or URL parameter.

### Participant ID Generation
**Primary (Blaze)**: Cloud Function `generateParticipantId` generates a cryptographically random, human-readable ID (`FUTA-DFS-{6-char-base36}`) server-side on registration and writes it to `users/{uid}.participantId`. The client never constructs or modifies this.

**Spark fallback**: Client generates a random 6-char suffix, then uses a Firestore transaction to write to `participantIds/{generatedId}` with `create` semantics. If the document already exists (collision), retry with a new suffix. The ID is then stored in `users/{uid}`.

### Contributor Tool Submission
**Primary (Blaze)**: Callable Cloud Function `submitToolContribution` verifies a hashed access code (stored in `contributorAccess/{id}`, never in the client bundle), applies rate limiting via a counter document, checks App Check, then writes the submission as `status: 'pending'`. The raw access code is never logged or returned.

**Spark fallback**: Contributor registers a normal account. Admin approves the account by setting `users/{uid}.contributorApproved = true`. Firestore rules allow tool creation only from approved contributors. **Note**: anonymous code-gated submission is not securely possible without a backend function.

### Phase Enforcement
**Primary**: Firestore rules read `programmeSettings/current.{pre|post|cert}SurveyState` using `get()` and reject writes when the state is not `'open'`.

**Spark fallback**: Same `get()` approach in rules — this works on Spark because it's a rules-level call, not a Cloud Function.

### Certificate Issuance
**Primary (Blaze)**: Callable Function `issueCertificate` verifies all eligibility conditions (both surveys submitted, cert phase open, not revoked), creates `certificates/{uid}` atomically (document ID = uid guarantees one per participant), returns the certificate data. PDF is drawn client-side from the returned snapshot.

**Spark fallback**: Firestore rules enforce `!exists(/databases/$(database)/documents/certificates/$(request.auth.uid))` on create, and check survey completion and phase state via `get()`. The document ID = uid ensures one certificate. The PDF is still generated client-side.

## 3. Storage Decision
Firebase Storage is available on Blaze. Images are:
- Compressed client-side to ≤ 150 KB before upload (using browser Canvas API)
- Validated for type (JPG, PNG, WebP only) and size in the client and in Storage rules
- Stored at `toolkit-images/{toolId}/{logo|screenshot}.{ext}`
- Served via Storage download URLs cached in the Firestore record

**If Storage is unavailable**: store compressed images (≤ 150 KB) as base64 in a separate `toolkitImages/{toolId}` Firestore document (not in the public `toolkitEntries` document to avoid inflating reads). Trade-off: Firestore document reads cost more per byte than Storage; total cost remains low at project scale.

## 4. Secrets Policy
- Firebase web config (`apiKey`, `projectId` etc.) goes in `.env.local` (gitignored) and is loaded at build time. It is **not a secret** but is not a security control — security comes from Firestore rules and App Check.
- Service account keys are **never** committed. Used only in local scripts and CI environment variables.
- Contributor access codes are stored **hashed** (SHA-256) in Firestore, server-side only. The raw code is shown to the admin once and never retrievable.
- No secrets, keys or codes in the client bundle.

## 5. Data Model Summary
See Section 19 of the master prompt. Key structural decisions:
- `surveyResponses/{uid}_{pre|post}`: deterministic document ID prevents duplicate submissions without a transaction.
- `toolkitEntries/{toolId}` (public fields) + `toolkitPrivate/{toolId}` (contributor PII, moderation notes): split prevents accidental exposure of private data in public queries.
- `certificates/{uid}`: document ID = uid enforces one-per-participant at the rules level.
- `adminAuditLogs/{logId}`: append-only, admin-write-only; participants cannot read.

## 6. Read Optimisation
- Public toolkit directory: paginated queries (limit 24), indexed on `status + category + costType`.
- Analytics dashboard: aggregation documents updated by Functions (or incremented client-side in transactions) to avoid full-collection scans.
- Real-time listeners: admin pending queue only; all other admin views use one-time `getDocs`.
- Client-side search: operates on a cached page (≤ 200 records). Beyond that, Firestore array-contains queries on a `keywords` field handle prefix search.

## 7. Features Requiring Paid Plan (Blaze)
| Feature | Reason | Spark alternative |
|---|---|---|
| Secure participant ID generation | Cloud Function | Client-side with transaction (documented above) |
| Contributor code verification | Cloud Function | Approved-contributor accounts |
| Certificate eligibility enforcement | Cloud Function (strongest) | Firestore rules with get() (adequate) |
| Firebase Storage for images | Not on Spark | Base64 in Firestore (see above) |
| Auth user deletion | Admin SDK Function | Deactivation flag only |

## 8. Not In Scope (This Release)
- PDF cryptographic signing or public certificate verification URL
- SMS notifications
- Payment processing
- External analytics (Google Analytics optional, not required)
- Multi-language support
