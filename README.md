# RAISSAT Digital Food Systems Platform

**Project:** Preparing the Next Generation for Digital Food Systems: AI, Data, and Innovation from Farm to Fork  
**Lead:** Oladipo Esther Modupe · RAISSAT Community Impact Project · FUTA, Akure, Nigeria

---

## What Is Built

A complete, responsive, secure web application with three connected systems:

| System | Status |
|---|---|
| Programme Management Portal — registration, auth, assessments, dashboard, certificates | ✅ Complete |
| Digital Food Systems Toolkit Directory — search, filter, contribute, moderate, lightbox | ✅ Complete |
| Administrator Dashboard — phases, participants, analytics, challenge, exports, settings | ✅ Complete |

### All Pages
| Route | Description |
|---|---|
| `/` | Public homepage — hero, about, key areas, how-it-works |
| `/toolkit` | Searchable public toolkit directory with filters |
| `/toolkit/:id` | Tool detail page |
| `/contribute` | Tool submission portal |
| `/register` | Participant registration with Firebase Auth |
| `/login` | Login |
| `/reset-password` | Password reset |
| `/dashboard` | Student dashboard with phase status and progress |
| `/assessment/pre` | 30-question pre-training assessment |
| `/assessment/post` | 30-question post-training assessment |
| `/certificate` | Certificate eligibility and A4 PDF download |
| `/privacy` | Draft privacy notice (NDPA 2023 compatible) |
| `/admin` | Admin overview with live counts |
| `/admin/participants` | Searchable, sortable, exportable participant table |
| `/admin/pre-survey` | Pre-assessment submissions + reopen |
| `/admin/post-survey` | Post-assessment submissions + reopen |
| `/admin/impact` | Charts — confidence, tool familiarity, career influence |
| `/admin/challenge` | Group challenge scoring (0–4 per criterion, max 20) |
| `/admin/toolkit` | Toolkit moderation — approve, reject, edit, delete |
| `/admin/phases` | Phase open/close controls with confirmation |
| `/admin/certificates` | Certificate list, revoke, reinstate, export |
| `/admin/settings` | Programme details, logos, certificate config |

---

## Quick Start

```bash
git clone <repo-url> && cd raissat-app
npm install
cp .env.example .env.local   # fill in Firebase values
firebase emulators:start      # terminal 1
npm run dev                   # terminal 2 → http://localhost:5173
```

See **DEPLOYMENT.md** for full setup, first-admin bootstrap, and production deployment.

---

## Stack

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS v4**
- **React Router v6**
- **Firebase** — Auth, Firestore, Storage, Hosting
- **Recharts** — analytics charts
- **jsPDF** — A4 landscape certificate generation
- **Lucide React** — icons

---

## Security Architecture

- Admin role: custom claim via bootstrap script (never via UI)
- Participant ID: server-side generation (FUTA-DFS-XXXXXX)
- Phase enforcement: Firestore rules + server-side, not UI-only
- Certificate eligibility: Firestore rules enforce both surveys + open phase
- Duplicate survey prevention: deterministic doc ID (`uid_pre`, `uid_post`) + create-only rules
- Audit log: append-only; every phase change, approval, and export logged
- Private toolkit data: separate `toolkitPrivate` collection, admin-only
- No secrets in client bundle; service account keys never committed

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `/dist` |
| `npm run preview` | Preview production build locally |
| `npm run test:rules` | Run Firestore security rules tests (needs emulator) |
| `firebase deploy` | Deploy hosting + rules + indexes |
| `node scripts/bootstrap-admin.cjs --uid=<UID>` | Grant admin role (run once) |
