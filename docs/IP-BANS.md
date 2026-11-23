# StudyOS IP bans

This is a **manual** ban mechanism, not automatic detection. It applies to
Express API requests and Socket.IO connections. Bans persist in the primary
MongoDB database, and expired bans stop matching immediately (TTL deletion
happens asynchronously).

## Operator commands

From the `server` directory with `MONGO_URI` configured:

```bash
node scripts/ipBan.js ban 203.0.113.42 24 "Repeated malicious requests"
node scripts/ipBan.js ban 203.0.113.42 permanent "Confirmed abuse"
node scripts/ipBan.js list
node scripts/ipBan.js unban 203.0.113.42
node --test tests/clientIp.test.js
```

Use a temporary ban unless there is a compelling reason to block permanently.
The manual CLI is not an HTTP route. Owner-only API endpoints are available at `/api/security` when explicitly enabled by Firebase UID.

## Reverse proxies

`STUDYOS_TRUST_PROXY_HOPS` currently defaults to **1** for backwards
compatibility. **Do not use this default for the StudyOS Render deployment.**
On November 22, 2026, a separate temporary Render probe observed:
- Normal request: 3 `X-Forwarded-For` entries; 3 hops matched `CF-Connecting-IP`.
- Request with a user-supplied fake `X-Forwarded-For` entry: 4 total entries;
  3 hops still matched `CF-Connecting-IP`, but 4 hops did not.
- For this specific Render deployment, set `STUDYOS_TRUST_PROXY_HOPS=3`
  **before merging**, then verify API and Socket.IO behavior on Render.
- Do not use `4` simply because it matched the initial no-spoof request.
- Set to **0** for direct connections without a proxy.

These observations support, but do not fully prove, the three-hop trust
boundary. Confirm the last trusted proxy appends forwarding information
correctly and there is no alternate shorter path that an untrusted client
can reach. Recheck after CDN, domain, or infrastructure changes.

If proxy settings are wrong, you can accidentally ban a shared proxy address
or allow IP spoofing. Verify the effective client address in a private staging
environment before enabling operational bans.

## Behavior and limitations

- API requests from banned IPs receive HTTP 403 (or 503 if ban lookup fails).
- Socket.IO rejects banned handshakes. Existing sockets are disconnected by
  a periodic scan (up to 30 seconds after a ban is saved).
- This does not block the Vercel-hosted static website. For network-edge bans,
  configure an ingress firewall at the actual hosting edge.
- IPs are **not user identities**. VPNs/mobile IP rotation can evade bans;
  schools, offices and households may share addresses. Prefer account-based
  moderation in addition to IP bans.
- IP addresses are personal data. Restrict MongoDB access, retain a limited
  reason, use temporary durations, and remove bans that are no longer needed.
- Do not automatically impose permanent bans solely from request volume.
- This mechanism does not fix existing group-room membership revocation issues.

## Render Free: protected administrator UI

On Render Free there is no shell, so StudyOS provides an **unlisted** management page at `/app/security` and corresponding backend API.

1. After deploying, sign in to your own StudyOS account and open `https://studyos37.space/app/security`. The page displays **only your signed-in Firebase UID** when access is not configured.
2. In the original Studyos Render backend environment, set `STUDYOS_SECURITY_ADMIN_UID` to **your exact Firebase UID** (not your email, and never a client-provided role).
3. Save, deploy, sign out/in again, and reopen `/app/security` to manage bans. Ban/unban changes require login within the past 15 minutes.
4. The admin page can create 1–720 hour temporary bans, deliberate permanent bans, list the latest 100 active bans, and unban IPs. It cannot ban the administrator's current IP.

Without that variable, administrative operations fail closed with HTTP 403. `GET /api/security/me` only returns the current user's UID and their authorization status; it does not reveal who is the administrator. All changes require Firebase token verification, revocation checking for mutations, recent `auth_time`, and rate limiting.

**Do not add the admin UID to frontend Vite environment variables.** Keep it server-side in Render.

## Pre-merge and rollback checklist

- CI: backend syntax, full npm clean install, dependency audit, protected HTTP API tests and client build must pass.
- Check `STUDYOS_TRUST_PROXY_HOPS=3` in Render and confirm regular + forged-XFF probe paths match the Cloudflare-reported client address.
- Test with separate staging database and two different real client networks, including existing active sockets. Never ban production users during testing.
- Verify account access and owner-only admin API; no admin UID means management endpoints are disabled.
- Production Render uses `main` with auto-deploy on commits. Retain current live commit and use the Render Deploys page for rollback if needed.
- Delete the temporary diagnostic service after deployment verification.

IP ban administration **does not** protect the Vercel static landing page, and it does not resolve the separate group membership revocation or upload integrity issues.