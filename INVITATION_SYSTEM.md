# Invitation-only registration (maximum 60)

## How it works
- 60 six-letter codes are saved in Firestore by the admin (Admin -> Invitation Codes). Each code is stored under the
  document ID `SHA-256("raissat-invite:v1:" + CODE)` in `inviteCodes`; the readable code is in `inviteCodeSecrets`
  (admin-only). Codes are NOT in the website files or in this repository.
- Registering runs ONE Firestore transaction: mark the code used + add 1 to `registrationCounter/state` + create the
  user profile (name, email, gender, code hash, time). `firestore.rules` re-checks all of it on Google's servers:
  the code must be unused, the counter can only rise by exactly 1, and never above 60. A profile cannot be created
  without consuming a code, so there is no way around it from the browser.
- A code is only marked used when the whole transaction succeeds. Wrong or abandoned attempts never use a code.
  If the account was created but the transaction fails, the new login is deleted again.

## Admin
- Admin -> Invitation Codes: statistics, list of all 60 codes (USED/UNUSED, time, who), gender counts,
  CSV export of registrations (with gender) and of code status.

## Limits of a website without a server (be aware)
- Firestore rules cannot rate-limit. The page slows wrong guesses (5 wrong -> 5 minute pause) but a script that skips
  the page is not slowed by that. Firebase also throttles repeated sign-ups. For extra protection turn on Firebase
  App Check (reCAPTCHA), or move registration into a Cloud Function (needs the paid Blaze plan).
- Test registrations use up real codes. Do not test with the codes you will hand out.
- People who registered before this update are not counted in the 60.
