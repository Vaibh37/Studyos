# StudyOS performance

## First performance release

Baseline: `5dcf660` (public homepage polish). The following numbers are from
local production builds, not claimed production or real-user speeds.

| Measurement | Before | After |
| --- | ---: | ---: |
| Cold Dashboard study-data HTTP GETs | 3 | 1 |
| Nine public screenshot files (bytes) | 1,283,229 | 486,196 |
| Entry JS/CSS and HTML module-preload assets (gzip bytes) | 132,225 | about 121,500 |
| Mobile homepage hero image decoded, median | 4,688 ms | 2,444 ms |
| Transferred local resource body bytes at hero decode, median | 456,662 | 240,570 |
| External SDK requests attempted before hero decode, median | 3 | 0 |

Mobile simulation: four fresh Chromium contexts per build, alternated order,
390 × 844 viewport, 4× CPU slowdown, 75 ms simulated latency, 200 KB/s download
and 100 KB/s upload; local HTTP server used gzip for HTML, CSS and JavaScript.
Both builds use identical synthetic Firebase config including a non-production
App Check key; all external requests were blocked. Timing measures the real
hero image's decode completion, not Lighthouse LCP or real-user latency.

### Changes

- Dashboard's fixed read-only bundle uses parallel owner-scoped MongoDB queries
  through the existing authentication, revocation, IP ban, App Check, and
  rate-limit middleware, with a stricter 60/min account bundle limit.
- The existing 20-second account-instance-scoped list cache remains in memory.
  The bundle populates those same three list caches; mutations, reconnects and
  identity changes invalidate them. Manual refresh still bypasses cached values.
  Only a missing route (404 during staggered deployment) uses legacy reads.
- New additive owner/sort compound indexes on Tasks, Events, Subjects and Study
  Sessions eliminate the need for blocking sorts when selected by the DB planner.
  Existing indexes and data are retained.
- App Check, Google Identity, streak animation and opt-in analytics are loaded
  only where needed. App Check's configured reCAPTCHA Enterprise provider and
  token refresh are unchanged; authenticated workspace restoration warms it.
- The shell and actual startup page are requested concurrently. Speculative
  preloads are suppressed on 3G, 2G, Save-Data and offline connections.
- All nine WebP variants are lossless (decoded RGBA exactly matches PNG).
  The PNG originals remain available for documentation and sharing metadata.
- Cache headers target public static asset paths only: hashed Vite JS/CSS for
  a year, unversioned screenshots/fonts for one day. HTML and private API
  responses do not receive these cache headers.

### Verification

Run `node --test client/tests/*.test.mjs`, then the normal StudyOS security
and browser E2E workflows. The browser E2E cold-dashboard assertion records
the actual authenticated request paths. The authorization test compares the
new endpoint against the original three routes and verifies owner isolation.
If a marketing screenshot changes, use
`python client/scripts/optimize-marketing-screenshots.py` (Pillow installed)
to regenerate the matching lossless variants before running the normal build.
