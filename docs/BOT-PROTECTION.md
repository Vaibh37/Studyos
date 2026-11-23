# StudyOS bot-protection rollout

## What ships safely without console changes

- **Group creation:** Firebase-authenticated users can create at most 5 groups per hour per backend process.
- **Group joining:** at most 12 invite-code attempts every 15 minutes per Firebase UID; malformed invitation codes are rejected before a DB lookup.
- **Cloudflare Turnstile hooks:** the group-create and group-join flows request a challenge token, then send it to the backend for *server-side* validation.
- **Firebase App Check hooks:** optional web App Check tokens are attached to HTTP API requests (`X-Firebase-AppCheck`) and Socket.IO connection authentication (`appCheckToken`).
- Both external defenses default to **off** server-side until deliberately configured. No live users are locked out by deployment alone.

## Activate Cloudflare Turnstile

Cloudflare Turnstile can be used without moving StudyOS DNS to Cloudflare.

1. In [Cloudflare Turnstile](https://dash.cloudflare.com/), create a **managed** widget for `studyos37.space` (and any real additional hostnames you use). Copy its **site key** and **secret key**; they are different.
2. Set `VITE_TURNSTILE_SITE_KEY` to the **public site key** in **Vercel** and deploy the client. A configured widget runs on creating/joining groups; normal pages have no challenge.
3. Set `TURNSTILE_SECRET_KEY` to the **private secret** in **Render**. **Never** put it in a `VITE_` variable.
4. Set `TURNSTILE_ALLOWED_HOSTNAMES=studyos37.space` in Render; add exact additional public hostnames separated by commas when required.
5. Start with `STUDYOS_TURNSTILE_MODE=audit` in Render, then use a test account to create and join a group. Once both flows work, set `STUDYOS_TURNSTILE_MODE=enforce`.
6. If the widget fails, revert to `audit` while checking domain configuration; do not disable Firebase Auth.

Tokens are short-lived, single-use, and verified against Cloudflare Siteverify, the expected action (`group-create` or `group-join`) and approved hostname. **Do not reuse a token between actions.** This protects only these StudyOS endpoints; Firebase's account-creation API is managed by Firebase separately.

## Activate Firebase App Check for the custom API

1. In Google Cloud console for project `studyos-89d8a`, open **Fraud Defense (reCAPTCHA Enterprise)**, enable the API if prompted, and create a **Website / score-based** key for `studyos37.space` (include any other real application hostnames). Keep checkbox challenges off. In Firebase **App Check → Apps → StudyOS Web → Register**, expand **Fraud Defense** and enter that public Enterprise site key. Do not use the deprecated reCAPTCHA Classic secret-key field. Check costs and quota before activating billing; the entry-level App Check flow does not need an automatic Blaze upgrade.
2. Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` on Vercel to the same **public reCAPTCHA Enterprise site key** and deploy the client. The StudyOS web code uses `ReCaptchaEnterpriseProvider`.
3. Set `STUDYOS_APP_CHECK_MODE=audit` on Render. Review the sampled aggregate audit logs while checking multiple real signed-in workflows. In this mode bad/missing tokens are counted, *not rejected*.
4. Only once the app consistently supplies valid App Check tokens, set `STUDYOS_APP_CHECK_MODE=enforce` to require verified App Check tokens for HTTP `/api` and Socket.IO connections. The server uses Firebase Admin SDK's `getAppCheck().verifyToken()`.
5. Local development or preview sites need registered compatible hostnames or an explicitly managed Firebase App Check debug token configuration. **Never** put a debug token in a production build.

App Check is a complementary app-attestation signal, **not a replacement** for Firebase Auth, per-user authorization, or IP and socket rate limits. Browser attestation can still be abused by sophisticated attackers.

### Firebase Authentication signup is a separate service

Protecting Firebase **Authentication itself** with App Check requires **Firebase Authentication with Identity Platform**, which may involve a billing/plan change. **Do not enable Identity Platform just for this PR without checking its pricing and impacts.** Turnstile on StudyOS's group-create/join endpoints does not block an attacker from calling Firebase Auth signup directly.

## WAF / edge bot management

A Cloudflare WAF or bot rule only protects traffic **that actually passes through Cloudflare's proxied DNS/CDN**. StudyOS API traffic currently uses a Render-hosted URL; adding WAF rules for the Vercel site alone does **not** protect direct requests to that Render host. A dedicated proxied custom API domain plus appropriate origin restrictions would be a separate infrastructure change. Do not assume that Cloudflare WAF is active without confirming DNS and origin routing.

## Controls and rollout verification

| Render variable | Default | Production activation |
| --- | --- | --- |
| `STUDYOS_TURNSTILE_MODE` | `off` | `audit` → `enforce` after both group forms verified |
| `TURNSTILE_SECRET_KEY` | unset | Private secret, server only |
| `TURNSTILE_ALLOWED_HOSTNAMES` | unset | Exact site hostname(s) |
| `STUDYOS_APP_CHECK_MODE` | `off` | `audit` → `enforce` after HTTP/socket tests |

| Vercel variable | Default | What it means |
| --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | unset | Public Cloudflare Turnstile site key |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | unset | Public Firebase reCAPTCHA v3 App Check site key |

Run automated CI before merging, then smoke-test production health, anonymous API denial, group-create/join with real keys, ordinary Focus, notes, and live sockets. Never run flood tests against real users. No production Turnstile secret, Firebase App Check site key, or WAF configuration is created by this PR.

Official references: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ and https://firebase.google.com/docs/app-check/custom-resource-backend .
