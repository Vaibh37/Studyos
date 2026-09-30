StudyOS auth speed pass

Files:
- client/src/context/AuthContext.jsx
- client/src/firebase.js

Changes:
1. Removes Google's forced `prompt: select_account`.
2. Updates Firebase user state immediately after successful login/register.
3. Stops automatically calling the redundant `/api/auth/me` request on every auth-state restore.
4. Starts `/api/health` in the background while Firebase login is happening, allowing a sleeping Render backend to wake in parallel.
5. Keeps `verifyBackendUser()` available if a future screen explicitly needs it.
6. Existing protected API endpoints still verify Firebase ID tokens server-side.

Important:
This does NOT bypass or weaken Firebase authentication.

Test:
- returning signed-in user: `/` -> `/app`
- Google sign-in
- email sign-in
- email registration
- logout
- guest mode
- reload `/app/dashboard`

If production backend is on Render free tier, the first data request can still be delayed by a cold start, but this patch starts that wake-up earlier instead of serially after login.
