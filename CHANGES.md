# Changes in this rebuild

1. **Toolkit submission** – `firestore.rules`: anyone can create a *pending* tool (validated, Cloudinary images only) and its private contributor details; only admins can read/approve. `ContributePage.tsx` now shows the real error code.
2. **Admin saves** – Settings, logo upload and Phases now use `setDoc(..., { merge: true })` so they work on a fresh database. Settings form waits for saved values before loading. Certificate defaults are merged. Moderation page shows errors.
3. **Mobile** – `AdminLayout` stacks on phones (content was collapsing to zero width). `<Link><Button/></Link>` replaced by `ButtonLink` everywhere (dead taps on phones).
4. **Categories** – one shared list in `src/lib/constants.ts` used by both the contributor form and the viewer filter. Four extra filter-combination indexes added to `firestore.indexes.json`.
5. **Privacy page** – draft warning box removed.
6. **Hosting** – `.github/workflows/deploy.yml` now deploys to GitHub Pages (https://agrictool.github.io/) with a 404.html fallback. Firebase Hosting is no longer used; Firebase is still the database and login.
