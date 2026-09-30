StudyOS performance pass

Targets the client bootstrap/auth path. No Render warm-up logic is included.

Changes:
- removes React StrictMode from the app root so development doesn't intentionally re-run data effects
- preconnects to Google/Firebase auth hosts
- removes automatic backend /api/auth/me verification
- updates React auth state immediately after successful Firebase login
- preloads StudyApp + Dashboard + Sidebar while authentication is in progress
- coalesces simultaneous Firebase ID-token reads across parallel API calls
- does not force Google's account chooser

Important:
StrictMode duplicate-effect behavior is primarily a development issue.
Production builds do not perform StrictMode's extra development checks.

Test both:
1. `npm run dev`
2. `npm run build && npm run preview`

That comparison tells you how much of the perceived slowness was dev-only.
