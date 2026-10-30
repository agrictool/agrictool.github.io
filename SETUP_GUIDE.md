# RAISSAT Digital Food Systems Platform
## Complete Setup Guide — GitHub · Firebase · Cloudinary
### No terminal required. Everything done through web browsers and GitHub Desktop.

---

# PART 1 — CLOUDINARY SETUP
### (Do this first — takes 5 minutes)

Cloudinary hosts your images for free. You need two things from it: your **Cloud Name** and an **Upload Preset**.

---

## Step 1.1 — Create Your Free Cloudinary Account

Go to **cloudinary.com** in your browser.

Click **"Sign Up For Free"** in the top right corner.

Fill in your name, email address, and a password. You do not need to enter a credit card.

Click **"Create Account"**.

Check your email and click the confirmation link Cloudinary sends you.

---

## Step 1.2 — Get Your Cloud Name

After logging in, you will land on your Cloudinary **Dashboard**.

At the top of the dashboard you will see a box labelled **"Product Environment Credentials"**.

Inside it you will see **"Cloud name"** followed by a short word (something like `dxyz12abc`).

**Copy this value and save it somewhere** — you will need it later. This is your `VITE_CLOUDINARY_CLOUD_NAME`.

---

## Step 1.3 — Create an Upload Preset

Still on the Cloudinary Dashboard, click the **gear icon ⚙️** at the top right, or go to **Settings** in the left sidebar.

Click **"Upload"** in the settings menu.

Scroll down until you see the section called **"Upload presets"**.

Click **"Add upload preset"**.

You will see a settings page for the new preset. Change the following:

- **Upload preset name:** Type `raissat_uploads` (or any name you like — write it down)
- **Signing Mode:** Change this from "Signed" to **"Unsigned"** — this is the important one, it allows the browser to upload directly without a backend

Leave everything else as the default.

Scroll down and click **"Save"** at the bottom.

You will now see `raissat_uploads` listed under Upload Presets.

**Copy the preset name** — this is your `VITE_CLOUDINARY_UPLOAD_PRESET`.

---

That is all you need from Cloudinary. Keep the tab open in case you need to refer back to your Cloud Name.

---
---

# PART 2 — FIREBASE SETUP
### (Takes 10–15 minutes)

Firebase handles your database, authentication, and hosting — all free on the Spark plan.

---

## Step 2.1 — Create Your Google Account (Skip If You Have One)

Firebase requires a Google account. If you already have Gmail, you have one.

If not, go to **accounts.google.com** and create a free account.

---

## Step 2.2 — Create Your Firebase Project

Go to **console.firebase.google.com** and sign in with your Google account.

Click the large **"Add project"** card.

**Project name:** Type `raissat-dfs` (you can use any name — it just needs to be unique).

Click **Continue**.

On the **Google Analytics** screen, toggle it **OFF** — you do not need it. Click **Create project**.

Wait about 30 seconds while Firebase sets up your project. Then click **Continue**.

You are now inside your Firebase project console.

---

## Step 2.3 — Enable Email/Password Authentication

In the left sidebar, click **Build** then click **Authentication**.

Click **"Get started"**.

You will see a list of sign-in providers. Click **"Email/Password"**.

Toggle the **first switch** (Email/Password) to **Enabled** — it turns blue.

Leave the second switch (Email link / passwordless) as disabled.

Click **Save**.

---

## Step 2.4 — Create Your Firestore Database

In the left sidebar, click **Build** then **Firestore Database**.

Click **"Create database"**.

A dialog appears asking about security rules. Select **"Start in production mode"**. Click **Next**.

**Choose your Firestore location:** Select **`europe-west1`** — this is the closest Google data centre to Nigeria with reliable latency. Click **Enable**.

Wait about 60 seconds for Firestore to set up. You will see an empty database when it is ready.

---

## Step 2.5 — Enable Firebase Hosting

In the left sidebar, click **Build** then **Hosting**.

Click **"Get started"**.

Firebase will show you a screen with terminal commands. **Ignore all of those** — just click **Next**, **Next**, then **"Continue to console"**.

Hosting is now enabled. Your live site will be at `your-project-id.web.app`.

---

## Step 2.6 — Get Your Firebase Web Config

Click the **gear icon ⚙️** at the top left next to "Project Overview". Select **"Project settings"**.

Scroll down to the **"Your apps"** section.

Click the **web icon** `</>` to add a web app.

- **App nickname:** Type `raissat-web`
- Leave "Also set up Firebase Hosting" **unchecked**
- Click **"Register app"**

You will now see a block of code containing your config values. It looks like this:

```
apiKey: "AIzaSyABC..."
authDomain: "raissat-dfs.firebaseapp.com"
projectId: "raissat-dfs"
storageBucket: "raissat-dfs.appspot.com"
messagingSenderId: "123456789012"
appId: "1:123456789012:web:abc123def456"
```

**Copy all six values and save them somewhere safe** — you will need them shortly.

Click **"Continue to console"**.

---

## Step 2.7 — Add Firestore Security Rules

Your Firestore database currently has basic rules that block everything. You need to replace them with the app's real security rules.

In the Firebase Console left sidebar, click **Firestore Database**.

Click the **"Rules"** tab at the top of the page.

You will see a text editor with some default rules. **Select all the text and delete it.**

Now open the file `firestore.rules` from your project folder on your computer using **Notepad** (right-click the file → Open with → Notepad).

**Select all the text** (Ctrl+A) and **copy it** (Ctrl+C).

Go back to the Firebase Console rules editor and **paste** the text (Ctrl+V).

Click **"Publish"**.

A confirmation dialog appears — click **"Publish"** again.

Your security rules are now live.

---

## Step 2.8 — Create Firestore Indexes

Your app needs seven database indexes to run its queries efficiently. Create them one by one:

In the Firebase Console, click **Firestore Database**, then click the **"Indexes"** tab.

Click **"Add index"** for each row in the table below:

---

**Index 1**
- Collection ID: `toolkitEntries`
- Fields:
  - `status` — Ascending
  - `approvedAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 2**
- Collection ID: `toolkitEntries`
- Fields:
  - `status` — Ascending
  - `category` — Ascending
  - `approvedAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 3**
- Collection ID: `toolkitEntries`
- Fields:
  - `status` — Ascending
  - `costType` — Ascending
  - `approvedAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 4**
- Collection ID: `toolkitEntries`
- Fields:
  - `status` — Ascending
  - `toolType` — Ascending
  - `approvedAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 5**
- Collection ID: `surveyResponses`
- Fields:
  - `surveyType` — Ascending
  - `submittedAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 6**
- Collection ID: `users`
- Fields:
  - `department` — Ascending
  - `createdAt` — Descending
- Query scope: Collection
- Click **Create**

---

**Index 7**
- Collection ID: `users`
- Fields:
  - `academicLevel` — Ascending
  - `createdAt` — Descending
- Query scope: Collection
- Click **Create**

---

Each index shows a spinning icon while it builds — this takes 2–5 minutes each. You can continue with the other steps while they build in the background.

---

## Step 2.9 — Get a Firebase Service Account Key (for Auto-Deployment)

This allows GitHub to deploy your app to Firebase automatically whenever you push changes.

In the Firebase Console, click the **gear icon ⚙️** → **Project settings**.

Click the **"Service accounts"** tab.

Click **"Generate new private key"**.

A warning dialog appears — click **"Generate key"**.

A JSON file will download to your computer. **Do not open or share this file.** You will paste its contents into GitHub in the next part.

---
---

# PART 3 — GITHUB SETUP
### (Takes 10 minutes)

---

## Step 3.1 — Check Your Local Folder

Before opening GitHub Desktop, open your local repository folder in **File Explorer** and check:

✅ You should see a folder called `raissat-app` containing `src/`, `scripts/`, `tests/`, `package.json`, `firestore.rules`, `README.md` and other files.

❌ Delete these if they exist — they should not be committed:
- Any file called `.env.local`
- Any folder called `node_modules`
- Any folder called `dist`

---

## Step 3.2 — Commit and Push Your Code

Open **GitHub Desktop**.

Your repository should appear in the top-left dropdown. If not, go to **File → Add local repository** and select your project folder.

You will see a long list of files in the left panel under "Changes" — this is all your app code waiting to be committed.

At the **bottom left** of GitHub Desktop:

In the **Summary** box type:
```
Initial commit — RAISSAT Digital Food Systems Platform
```

Click the blue **"Commit to main"** button.

At the **top right** of GitHub Desktop, click **"Push origin"**.

Wait for it to finish. Your code is now on GitHub.

Go to **github.com**, open your repository, and confirm the files are there including `src/`, `firestore.rules`, `scripts/`, `tests/`, `.github/workflows/deploy.yml` and `README.md`.

---

## Step 3.3 — Add Secrets to GitHub

Your app needs environment variables to connect to Firebase and Cloudinary. These are stored as **secrets** in your GitHub repository — they are never visible in your code.

Go to your repository on **github.com**.

Click **"Settings"** (the tab at the top right of your repo page).

In the left sidebar, click **"Secrets and variables"** then click **"Actions"**.

Click **"New repository secret"** for each of the following — add them one at a time:

---

| Secret Name | Where to get the value |
|---|---|
| `VITE_FIREBASE_API_KEY` | From your Firebase config (Step 2.6) — the `apiKey` value |
| `VITE_FIREBASE_AUTH_DOMAIN` | From your Firebase config — the `authDomain` value |
| `VITE_FIREBASE_PROJECT_ID` | From your Firebase config — the `projectId` value |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From your Firebase config — the `messagingSenderId` value |
| `VITE_FIREBASE_APP_ID` | From your Firebase config — the `appId` value |
| `VITE_CLOUDINARY_CLOUD_NAME` | From Cloudinary Dashboard (Step 1.2) — your Cloud Name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | From Cloudinary Settings (Step 1.3) — your preset name e.g. `raissat_uploads` |

---

Now add the Firebase service account key:

Click **"New repository secret"**.

- **Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** Open the JSON file that downloaded in Step 2.9 using **Notepad**. Select all the text (Ctrl+A) and copy it (Ctrl+C). Paste it into the Value box.

Click **"Add secret"**.

**Delete the JSON file from your computer** — right-click it in File Explorer and click Delete. It has served its purpose and should not remain on your machine.

---

## Step 3.4 — Watch Your First Automatic Deployment

When you pushed your code in Step 3.2, GitHub automatically started deploying your app. The deployment workflow runs every time you push to the `main` branch.

Go to your repository on **github.com**.

Click the **"Actions"** tab at the top.

You will see a workflow run listed — it may show an orange dot (running) or a green tick (complete).

Click on it to watch the progress. It takes about 2–3 minutes.

When you see a green tick on **"Deploy to Firebase Hosting"**, your app is live.

---

## Step 3.5 — Find Your Live URL

Go to **Firebase Console → Hosting**.

You will see your live URL — something like:
```
https://raissat-dfs.web.app
```

Click it to open your live app. You should see the RAISSAT homepage.

---
---

# PART 4 — SET UP YOUR ADMIN ACCOUNT
### (5 minutes — done entirely in the browser)

---

## Step 4.1 — Register Your Admin Account

Go to your live app URL (from Step 3.5).

Click **"Create Participant Account"**.

Fill in the registration form with your real name, email address, department and level. Use a strong password.

Check the privacy notice checkbox.

Click **"Create Account"**.

You will be taken to your dashboard. You are currently registered as a regular participant — not yet an admin.

---

## Step 4.2 — Get Your User ID from Firebase

Go to **Firebase Console → Authentication → Users** tab.

You will see your email address listed. Click on the row.

On the right side you will see your **User UID** — a long string like `xK7mQ2abc123...`.

**Copy this UID.**

---

## Step 4.3 — Create the Admins Collection in Firestore

Go to **Firebase Console → Firestore Database → Data** tab.

Click **"+ Start collection"**.

- **Collection ID:** `admins`
- Click **Next**

For the first document:

- **Document ID:** Paste your UID (the one you copied in Step 4.2)
- Click **"+ Add field"**:
  - Field name: `role` | Type: `string` | Value: `admin`
- Click **"+ Add field"** again:
  - Field name: `grantedAt` | Type: `string` | Value: today's date (e.g. `2026-10-28`)

Click **Save**.

---

## Step 4.4 — Update Your User Role in Firestore

Still in **Firestore → Data**, click the **`users`** collection in the left panel.

Find the document with your UID — click on it.

Find the `role` field. Click the **pencil icon** next to it.

Change the value from `participant` to `admin`.

Click **Update**.

---

## Step 4.5 — Log Out and Log Back In

Go back to your live app.

Click your name in the navigation bar → click **"Sign Out"**.

Click **"Log In"** and sign in with your email and password.

You will now see **"Admin Dashboard"** in the navigation menu. Click it.

You are now the administrator of your RAISSAT platform.

---
---

# PART 5 — CONFIGURE YOUR APP AS ADMIN

These are the first things to do inside `/admin/settings` before opening the app to participants.

---

## Step 5.1 — Update Programme Settings

Go to your live app → **Admin Dashboard → Settings**.

Update the following fields:

- **Programme Title** — already set to the full project title; edit if needed
- **Programme Date** — change from "October 16, 2026" to your actual event date
- **Programme Location** — e.g. "FUTA, Akure, Ondo State, Nigeria"
- **Collaborating Organisation** — already set to FUTA SAAT; edit if needed
- **Project Description** — write 2–3 sentences about the project for the homepage
- **Contact Email** — your email address (shown on homepage footer)

Click **"Save All Settings"**.

---

## Step 5.2 — Upload Logos

Still on the Settings page, scroll to **"Organisation Logos"**.

Click **"Upload Logo"** under **RAISSAT Logo** — select your RAISSAT logo image.

Click **"Upload Logo"** under **Collaborator Logo** — select the FUTA logo image.

Logos are uploaded to Cloudinary automatically and saved to your database.

---

## Step 5.3 — Update Certificate Settings

Scroll to **"Certificate Settings"** on the same page.

Fill in:

- **Project Lead Name:** Oladipo Esther Modupe (already set)
- **Project Lead Title:** RAISSAT Research Fellow (or your preferred title)
- **Partner Signatory Name:** The FUTA signatory's name (e.g. Head of Department)
- **Partner Signatory Title:** Their title and department
- **Certificate ID Prefix:** `DFS` (already set — certificates will be labelled DFS-2026-XXXXXX)

Click **"Save All Settings"**.

---

## Step 5.4 — Open the Pre-Training Assessment Phase

When you are ready for students to register and complete the pre-assessment (typically 1–2 days before the event):

Go to **Admin Dashboard → Programme Phases**.

Click **"Open Phase"** next to **Phase 1 — Pre-Training Assessment**.

Confirm the dialog.

Students can now submit the pre-assessment.

---

## Step 5.5 — After the Training Event

**Open Post-Assessment** — go to Programme Phases → Open Phase 2 immediately after the training concludes.

**Open Certificates** — go to Programme Phases → Open Phase 3 after reviewing post-assessment data (typically 1–2 days later).

---
---

# PART 6 — MAKING CHANGES AFTER GOING LIVE

Every time you need to update the app code:

1. Make changes to the files in your local project folder
2. Open **GitHub Desktop** — it will show the changed files
3. Write a short commit message describing what you changed
4. Click **"Commit to main"**
5. Click **"Push origin"**

GitHub Actions will automatically rebuild and redeploy the app. It takes about 2–3 minutes. Check the **Actions** tab on GitHub to watch the progress.

**You never need to use the terminal.**

---
---

# QUICK REFERENCE — All Environment Variables

| Variable | Where to get it | Required |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase → Project Settings → Web app config | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase → Project Settings → Web app config | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase → Project Settings → Web app config | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase → Project Settings → Web app config | ✅ |
| `VITE_FIREBASE_APP_ID` | Firebase → Project Settings → Web app config | ✅ |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary → Dashboard → Cloud name | ✅ |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary → Settings → Upload → Upload presets | ✅ |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase → Project Settings → Service accounts → Generate key | ✅ GitHub secret only |

---

# TROUBLESHOOTING

**"The Actions tab shows a red X on the deployment"**
→ Click on the failed run → expand the failing step → read the error message.
→ Most common cause: a GitHub secret is missing or has a typo. Go to Settings → Secrets and check all names match the table above exactly (they are case-sensitive).

**"I can log in but do not see Admin Dashboard"**
→ You need to log out and log back in after completing Step 4.3 and 4.4. Firebase auth tokens update on login.
→ Double-check the `admins` collection document ID matches your UID exactly.

**"Images are not uploading in the toolkit"**
→ Check that `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are set correctly in GitHub secrets.
→ Check that your Cloudinary upload preset is set to **Unsigned** (not Signed).

**"Firestore indexes show a spinning icon"**
→ Indexes take up to 10 minutes to build after first creation. Wait and refresh the page.

**"The app shows a blank page"**
→ Open your browser's developer tools (F12) → Console tab → look for an error message.
→ Most common cause: a Firebase environment variable is missing or incorrect.

**"Certificate phase is open but participants cannot generate certificates"**
→ Confirm both surveys are submitted for that participant (Admin → Participants).
→ Confirm the participant's account status is "active" (Admin → Participants).
