# Privacy and recovery follow-up

This change is a privacy-by-default improvement, not a legal compliance certification. Review the public policy wording against actual provider configurations before release.

## Implemented in the candidate build

- Remove Google Analytics (GA4) from the initial HTML so the application no longer loads the Google Analytics tag.
- Keep optional Vercel Web Analytics off until a browser makes an affirmative choice on the privacy page. Respect Global Privacy Control and withdraw permission on that page, including after the SDK has loaded. Analytics events are restricted to a small allowlist of public paths; URL query strings and fragments are excluded. The application never intentionally sends custom study-content events.
- Disclose group records, message visibility, object storage, infrastructure and anti-abuse services, browser storage and optional analytics in the privacy policy. Provide a privacy settings link in the account settings and an abuse-report contact.
- Present a useful client-side not-found page instead of a silent redirect. The current Vercel SPA catch-all rewrite may still yield an HTTP 200 for unknown URLs; the page is marked noindex. Do not change the deep-link routing without verifying previews, static SEO routes and invite URLs.

## Operator decisions before a broader release

- Decide which ages the account and social features are intended for. Review applicable child-data rules and guardian-consent requirements with an appropriate legal professional. Adding a birthdate field or a terms checkbox alone is not sufficient; do not collect dates of birth unnecessarily or silently block existing students.
- Verify actual data retention and deletion timelines for Atlas, R2, Firebase, logs, and historical analytics data; add accurate retention details and request procedures to the public policy when known. Removing analytics code prevents new app-side tracking but does not erase previously collected analytics or disable provider-side infrastructure logs.
- Review the Vercel analytics dashboard to confirm its configuration matches the intended optional tracking implementation. Test a preview deployment network timeline for no analytics activity before permission, and no analytics events after withdrawal or during navigation through the private workspace.

## Database recovery drill (non-production targets only)

The application JSON export in Settings is not a substitute for infrastructure-level backups.

1. In MongoDB Atlas, verify the actual tier and backup capabilities for both account and social databases. Record the backup schedule, retention, recovery point/time targets and restore access. If a provider-managed snapshot is not supported, choose an encrypted, access-controlled logical backup process with credentials limited to the necessary operations. Verify R2 object recovery separately.
2. Restore a recent backup to an isolated test deployment with different database URIs and a separate object-store bucket. Never restore to the production databases or bucket during a drill.
3. Check record counts, indexes, sample referential relationships, account isolation, group membership and attachment availability. Check that a previously deleted account cannot reappear in production after a restore without an appropriate documented reconciliation procedure.
4. Record the recovery time, evidence and unresolved problems without including user details or credentials. Delete temporary restore artifacts only after the authorized retention period.
5. Review backup access, encryption, retention and restore success regularly. Never treat a successful backup job alone as proof of recoverability.

## Large-list performance

The existing task and note reads return complete arrays and downstream views, search, exports and data deletion depend on that contract. A safe pagination migration should introduce a separate bounded, user-scoped listing contract with deterministic ordering, preserve exports and bulk actions, and test filtering, mutations, concurrent changes, account isolation and guest/cloud parity before switching these views. A hard limit on the existing response would silently hide study data and can produce incomplete backups, so this change deliberately leaves the current data contract intact.
