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

## November 28, 2026: Legal pages follow-up

The public Terms and Privacy pages now clarify hosted service rules, Apache-2.0 rights, user content ownership, complaints and copyright reporting, applicable law, limited indemnification, data purposes, privacy requests, active-service deletion and retention categories.

This is a documentation change, not a new consent gate, age-verification system, moderation service, or legal compliance certification. Before general release:

- Confirm the operator's legal identity, governing-law wording (India was selected for the India-based operator), and whether group messaging triggers intermediary-specific obligations, including a designated grievance contact, response deadlines, notice and escalation procedures.
- Set and implement an age policy for account and collaboration features. Assess child-data requirements and obtain legally required authorization before processing where applicable. Do not treat Guest Mode or agreement to these terms as consent. The DPDP commencement notification provides a phased implementation timeline; confirm the applicable obligations and dates with counsel.
- Inventory retention periods and deletion/backup behavior across Firebase, MongoDB Atlas, R2, Render, Vercel, security records and historical analytics. Document the verified schedule rather than inventing time limits.
- Establish a private workflow for copyright, safety, privacy and security complaints, identity/authority verification for data requests, and compliant notice and consent for future material changes. Review the pages with an appropriate legal professional.

Official reference material reviewed:
- Digital Personal Data Protection Act, 2023: https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf
- Commencement notification G.S.R. 843(E), November 2025: https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf
- DPDP Rules, 2025: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended: https://www.meity.gov.in/static/uploads/2025/10/44e62510fb815a5cc72d094c7a5493b6.pdf
- Indian Contract Act, 1872: https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf
