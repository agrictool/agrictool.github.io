# Changes in this rebuild

1. **Toolkit submission** – `firestore.rules`: anyone can create a *pending* tool (validated, Cloudinary images only) and its private contributor details; only admins can read/approve. `ContributePage.tsx` now shows the real error code.
2. **Admin saves** – Settings, logo upload and Phases now use `setDoc(..., { merge: true })` so they work on a fresh database. Settings form waits for saved values before loading. Certificate defaults are merged. Moderation page shows errors.
3. **Mobile** – `AdminLayout` stacks on phones (content was collapsing to zero width). `<Link><Button/></Link>` replaced by `ButtonLink` everywhere (dead taps on phones).
4. **Categories** – one shared list in `src/lib/constants.ts` used by both the contributor form and the viewer filter. Four extra filter-combination indexes added to `firestore.indexes.json`.
5. **Privacy page** – draft warning box removed.
6. **Hosting** – `.github/workflows/deploy.yml` now deploys to GitHub Pages (https://agrictool.github.io/) with a 404.html fallback. Firebase Hosting is no longer used; Firebase is still the database and login.

## Round 2

7. **Logos** – uploaded logos were saved but never displayed. They now show in the header, footer, homepage "Participating Organisations" and on the certificate PDF. Each upload gets a unique file name (Cloudinary unsigned uploads cannot overwrite).
8. **Collaborators** – new **Admin → Collaborators** page: add any number of collaborating / contributing organisations with names and logos, change a logo, remove one. Shown on the homepage and footer. New `collaborators` rules.
9. **Assessment would not load** – the `surveyResponses` read rule depended on a document that does not exist yet, so the page hung on "Loading assessment…". The rule now uses the document ID. The page also no longer hangs if a read fails.
10. **Phases** – added **Reset to Not Opened** (from Open or Closed) on Admin → Programme Phases.
11. **Admin accounts** – admins can preview assessments but not submit; a banner and a clearer message now say so. Test submissions with a separate participant account.
