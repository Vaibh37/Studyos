StudyOS login diagnostic

This patch changes NO auth behavior. It only adds console timing.

Apply it, restart Vite, open DevTools -> Console, clear the console, then perform ONE login.

Copy every line beginning with:

[StudyOS perf

and send those lines back.

Important timings it reports:
- Firebase Google popup total
- Firebase email/password total
- initial onAuthStateChanged/session restoration
- app chunk preload
- Firebase getIdToken
- every API request duration

This will tell us where the ~25 seconds actually are.
