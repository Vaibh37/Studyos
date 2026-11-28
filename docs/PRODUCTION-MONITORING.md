# StudyOS production monitoring

The public [System Status page](https://studyos37.space/status) uses existing read-only API liveness, dependency readiness and process-uptime endpoints. It makes no background polling requests from the footer; only visits to the status page trigger a live check, and visitors can refresh explicitly. No availability badges or user-level telemetry are introduced, no new paid service is required, and production probes do not create or change study data.

Visitors can explicitly load recent completed scheduled production monitor runs from the public GitHub Actions API. The page links to the actual workflow records, distinguishes failed or inconclusive checks from confirmed incidents, and does not claim a continuous uptime percentage. Process uptime is time since the backend process started, not historical availability. The browser does not send StudyOS credentials to GitHub.

## Scheduled checks

- [Production monitor](https://github.com/Vaibh37/Studyos/actions/workflows/production-monitor.yml): hourly at minute 17 UTC (:47 IST), after relevant main-branch deployments, and on manual dispatch. It probes the public Vercel and Render endpoints and confirms a failure once after a 20-second pause. A cold API start has up to 90 seconds. A failed run has a concise check-by-check summary and a nonzero exit code.
- [Security checks](https://github.com/Vaibh37/Studyos/actions/workflows/ip-ban-security-checks.yml): daily at 03:43 UTC (09:13 IST), on applicable PRs and pushes, and on manual dispatch. These run lockfile vulnerability audits, secret detection, frontend build/unit tests, and backend authorization, socket, data isolation and integrity regressions against isolated CI MongoDB. They do not modify the production database.

GitHub schedules are best effort; runner delays are possible. Enable notifications for failed Actions runs in your GitHub notification preferences. Open the failing run's summary to identify the affected check.

To run the production checks manually with Node 24:

```sh
node ops/check-production.mjs
```

The public checks validate the frontend HTML, deep links, built entry assets, security/cache headers, API liveness/readiness, expected CORS behavior, and denial of anonymous access to selected private resources. They do not use test credentials or print response bodies. Readiness pings both MongoDB databases with bounded timeouts and checks whether Firebase Admin is configured; it does **not** prove Firebase can authenticate a real user or that R2 uploads/downloads work. Authenticated browser flows and upload round trips remain separate verification tasks.

## Render logs

Search backend logs for `studyos_http_window`. Active five-minute windows contain request outcome counts, coarse response-time buckets, approximate upper-bound p95 latency, fixed API-area counters, and aggregate socket counts. No IPs, request bodies, paths with identifiers, credentials or per-user metrics are included. Quiet periods and sleeping instances may have no entries. Metrics reset on process restart and are not a durable analytics database. Existing platform logs are governed by their own retention and access controls.

## Investigating a failure

1. Open the production monitor summary and compare the failing area with current Vercel and Render deployment status.
2. If readiness fails, check both MongoDB connections and Firebase Admin setup. Check the platform for an incident; do not expose connection strings or provider errors.
3. In Render, examine consecutive aggregate windows. Investigate repeated non-system 5xx errors (for example, at least five errors and at least 5% of completed non-system requests within an hour), increasing latency, sustained resource saturation or repeated restarts. A normal cold start, an expected 401/403 probe, or a single rate-limit response is not by itself an incident.
4. If security CI fails, inspect the failing test or vulnerability advisory before deploying further changes. Fix and retest in isolation; never weaken auth or run destructive production tests to make a check pass.
5. Verify recovery using the production monitor. If a deployment caused the incident, use the normal reviewed rollback or fix-forward process.
