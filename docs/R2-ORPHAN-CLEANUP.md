# StudyOS R2 orphan-file reconciliation

StudyOS group attachments are stored under `groups/<groupObjectId>/<uuid>/<fileName>` in Cloudflare R2.

## Why this exists

A five-minute presigned URL may upload an object without ever finalizing a group message. Previously the upload authorization had a one-hour MongoDB TTL. Once that tracking record disappeared, group/account deletion could no longer discover the R2 object. **Do not add a blanket R2 lifecycle deletion rule for `groups/`: it includes live attachments.**

## Production behavior

- On backend startup, an idempotent database migration removes the legacy `expiresAt` TTL index and replaces it with a normal lookup index. Upload authorizations still expire for finalization; only their tracking record persists.
- Every two hours (first run 30 seconds after startup), at most **two pages of 100 objects** are inventoried, preserving a cursor in social MongoDB. Only keys matching StudyOS's exact group-upload key pattern are considered.
- Only objects at least **72 hours old**, not referenced by a group message, and with no unexpired upload authorization can become candidates.
- Candidates must appear in at least **two separate scans 24 hours apart**, with the same R2 ETag and modification time. Before deletion, the backend rechecks message references, current upload authorization and physical R2 metadata. Any change cancels the previous confirmation.
- A failed R2 deletion stops the scan without advancing past the affected page. It retries later; the process never removes MongoDB tracking records before successful R2 deletion.
- **Default mode: `audit`**. Audits do not delete any R2 objects. Aggregate counts (no filenames, storage keys or user identifiers) are logged.

## Modes

Set `STUDYOS_R2_ORPHAN_MODE` **on the Render backend**, not in frontend configuration:

- `audit` (default): classify and confirm suspected orphans; no R2 deletes
- `off`: disable scheduled inventory scans; index migration still runs
- `delete`: explicitly opt in to deletion of confirmed orphan objects

Do not enable `delete` until the production audit results, R2 permissions, and bucket backups have been reviewed. A real-file cleanup is **not** exercised by automated tests.

## Limitations

- The scanner sees only objects returned by R2's S3-compatible `ListObjectsV2` API. R2 must permit listing `groups/` objects as well as reading object metadata. It processes a bounded number per run and may take multiple cycles to reach every key.
- It does not discover incomplete multipart uploads, data stored outside the generated `groups/<id>/<uuid>/...` pattern, or recently changed files. Other cleanup mechanisms may be needed for those cases.
- In a multi-instance deployment, add a distributed worker lease before enabling `delete`; the current scheduled sweep is intended for a single Render backend process.
- Reconciliation cannot guarantee that historical assets already removed from storage are recoverable. Deletion from R2 is irreversible without backups.
- No cron service or extra paid infrastructure is required: the existing backend schedules bounded sweeps.
