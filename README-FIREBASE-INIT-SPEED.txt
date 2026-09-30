StudyOS Firebase initialization speed test

What the previous trace proved:
- backend API calls: ~15–46ms
- Firebase getIdToken: ~13ms
- Firebase initial auth-state restore: ~3.85s
- Google signInWithPopup: ~14.87s

This patch targets Firebase startup overhead.

Changes:
- replaces getAuth() with initializeAuth()
- localStorage is the primary persistence
- IndexedDB remains as fallback so existing sessions can migrate safely
- popup/redirect resolver is NOT initialized globally
- browserPopupRedirectResolver is passed only when Google popup login is actually invoked
- keeps the existing [StudyOS perf] diagnostic logs so before/after numbers can be compared

After applying:
1. restart Vite
2. hard refresh
3. clear DevTools Console
4. test one returning-session load
5. log out
6. test one Google login
7. send the new [StudyOS perf] lines
