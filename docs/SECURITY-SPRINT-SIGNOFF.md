# StudyOS security sprint — final release checklist

## API request guard

The API preserves Express's existing 100 KB JSON body limit. The final security guard additionally:

- rejects request URLs over 8,192 characters and queries with over 48 parameters
- rejects non-JSON request bodies for POST/PUT/PATCH/DELETE
- rejects top-level arrays, deeply nested objects, and JSON keys often used in prototype pollution (`__proto__`, `prototype`, `constructor`)
- uses predictable 400/413/414/415 JSON responses and a generic 500 response without exposing stacks or request-body contents
- marks ordinary API responses `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`

Group attachments still upload *directly* to Cloudflare R2 using presigned URLs; the API accepts only JSON metadata, not multipart file bytes.

## Tracked configuration and secret checks

The repository ignore rules cover `.env`, `.env.*` (other than `.env.example`), and `firebase-service-account.json`. CI inspects tracked text files for common secret patterns and tracks accidental credential filenames. This is a **preventive, partial scan**, not a guarantee about repository commit history, hidden credentials in unusual formats, or production environment variables.

Review these settings directly in the secret manager (without copying values into GitHub or chat): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `MONGO_URI`, `MONGO_SOCIAL_URI`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `FRONTEND_URL`, `STUDYOS_SECURITY_ADMIN_UID`, `STUDYOS_TRUST_PROXY_HOPS`, and `ENABLE_ACCOUNT_DELETION`.

R2 orphan cleanup remains **audit-only** by default. Do not set `STUDYOS_R2_ORPHAN_MODE=delete` without a separate review and backups.

## Checks after merge

GitHub Actions covers isolated tests of private record authorization, IP bans, group membership revocation, attachment uploads, leaderboard integrity, Firebase revocation, account deletion, orphan-file safety, and the final payload guard, followed by a frontend build and production-dependency audit.

Safe production probes: `GET /api/health` should return 200; anonymous `GET /api/auth/me` and `GET /api/notes` should return 401; malformed or oversized JSON requests should receive sanitized 400/413 responses with no mutation.

**Not automated against real accounts:** signing in on a production browser, completing a Focus session, reading an owned note, uploading a real group attachment, and rejoining a Socket.IO group. These require a user-controlled authenticated session. Never run destructive account deletion or intentional flood tests against production.

## Residual risk

This is a security-hardening milestone, not a penetration-test certification. Secret scanning of **Git history**, network-edge DDoS defenses, multi-instance rate-limiter coordination, and hands-on production authentication checks remain separate operational work.
