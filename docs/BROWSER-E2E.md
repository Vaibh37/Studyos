# StudyOS browser regression tests

The [browser journeys workflow](https://github.com/Vaibh37/Studyos/actions/workflows/browser-e2e.yml) runs on relevant pull requests, pushes to main, and manual dispatch. It uses Playwright Chromium, including a Pixel 7 viewport/touch context. Tests exercise the actual React production bundle, Express entry point, Firebase SDKs, MongoDB models and Socket.IO handlers.

## What it exercises

- Email registration, logout, login, reload/session restoration and a protected deep link.
- First-run onboarding for new accounts and empty guest workspaces; guest step navigation, completion, reload persistence, replay in General settings, keyboard dismissal and focus restoration.
- Task creation, edit, completion, reload and deletion; rich note creation, editing, save, reload and deletion.
- Switching accounts in the same browser without exposing the other account's private tasks and notes.
- A genuine server-timed one-minute Focus session (including pause, reload and resume), public leaderboard opt-in and verified XP.
- Two independent accounts creating and joining a private group; live chat in both directions and history after reload.
- Attachment signing, upload, HEAD metadata verification, finalization, Socket.IO delivery and exact downloaded bytes.
- Touch-sized mobile navigation, task entry, settings drill-down/back and viewport overflow.

## Isolation

The test harness requires `STUDYOS_E2E=isolated-local-only`, constructs its own loopback-only endpoints, and discards provider credentials from the backend process. It uses the demo Firebase project `demo-studyos-e2e`, two randomly named local MongoDB databases, and in-memory object storage on loopback. It refuses to read application .env files for its test build/server and blocks external browser requests and WebSockets. No real Google login, Firebase App Check, Turnstile, production users, R2 bucket or production database is used. The real AWS signer and browser file transfer are exercised, but the local object fixture does not establish that Cloudflare itself accepts the signature or that public production R2 CORS is correct. Security unit/integration tests separately exercise signing and authorization controls. Chromium device emulation is not a substitute for real iOS Safari or Android device testing.

The test bundle lives in a temporary directory; the standard production Vite build has no emulator or auth bypass. Synthetic test data is dropped at shutdown; CI's MongoDB container is ephemeral. Failed runs retain screenshots of synthetic pages only for seven days, not network traces, tokens or real user data.

## Run locally

Use a **disposable** MongoDB 7 instance on 127.0.0.1:27017 and Node 24. Do not run against production credentials. Install the locked app dependencies and exact test tool versions from the workflow in a separate temporary directory; install Chromium with Playwright. Run the frontend preparation script, set `PLAYWRIGHT_MODULE` to the test package's `index.mjs`, set `STUDYOS_E2E=isolated-local-only`, then from the repository root:

```sh
firebase emulators:exec --only auth --project demo-studyos-e2e --config ops/e2e/firebase.json --non-interactive "node ops/e2e/run.mjs"
```

The test runner launches and cleans up the loopback backend, object fixture and production-style frontend preview. Use the job logs and any failure screenshots to diagnose regressions. Keep the real user journeys intact when updating selectors; avoid replacing failures with mocked happy-path responses.

## Adversarial regression journeys

The same workflow now also includes the [edge-case and chaos checklist](EDGE-CASE-CHAOS.md):
auth validation and duplicate registration, dropped reads and interrupted
signed uploads, simultaneous sessions and streak check-ins across time zones,
notification denial, theme persistence, narrow/landscape and large-root-font
layout checks, account deletion/re-registration and an isolated loopback IP ban.
