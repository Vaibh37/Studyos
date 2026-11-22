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
The CLI is intentionally **not** exposed as an HTTP route.

## Reverse proxies

`STUDYOS_TRUST_PROXY_HOPS` defaults to **1**, matching the existing Render
configuration. Set it to **0** for direct connections without a proxy.
The number must match the actual trusted proxy topology; the last trusted
proxy must overwrite or correctly append forwarding headers, and untrusted
clients must not be able to connect directly around that proxy.

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
