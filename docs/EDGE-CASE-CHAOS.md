# StudyOS edge-case and chaos regression checklist

This suite extends the existing isolated Playwright browser journeys and the
daily security checks. It is intentionally **not** a live production attack,
load test, penetration-test certification, or a promise that all devices work.

Run the browser workflow described in [BROWSER-E2E.md](BROWSER-E2E.md). No real
accounts, provider credentials, production MongoDBs or R2 buckets are used.
The test child allows account deletion only in its disposable namespace.
The last scenario temporarily bans **its own loopback IP**, via a private
parent-child IPC channel (no HTTP control route). The ban is removed in a
finally block and the disposable databases are dropped normally.

## Checklist and acceptance criteria

| Scenario | Coverage |
| --- | --- |
| Go back at checkout | N/A: StudyOS has no checkout; abandon signup/back navigation instead. |
| Sign up twice | Same-turn duplicate submit sends exactly one Firebase request; duplicate email is rejected; original credentials still work. |
| Empty email | Browser required validation blocks signup before Firebase. Invalid email also tested. |
| Spaces in password | All-whitespace/short passwords rejected before Firebase; meaningful leading/trailing/internal spaces preserved for signup and login. |
| Emoji username | Arabic and emoji display name survives registration and second-device login. |
| Hide my email / Apple | N/A: no Apple provider. Real Google OAuth requires a separate user-controlled smoke test. |
| Quit onboarding | Abandon form; opening a private route remains unauthenticated. |
| Deny permissions | Real Chromium notification denial; explanatory state and disabled test-send control. |
| 5,000-word bio | N/A: no bio; oversized signup name constrained, and API rejects a >100 KB JSON body with a sanitized 413. |
| Airplane mode during upload | Signed storage PUT deliberately aborted; error is visible, file retained, no receiver delivery; retry and exact bytes verified, no duplicate message. |
| Slow data | Real tasks GET intentionally dropped, then 1.5s delay applied to the retry; correct task list must recover. |
| Phone rotation | Landscape viewport and narrow portrait viewport with task controls usable and no horizontal overflow. |
| Huge text size | Double the root font size in narrow and landscape viewport; check controls and overflow. This is an approximate stress test, not full accessibility certification. |
| Arabic | Arabic browser locale plus Arabic/emoji task content through real persistence. The UI is English; Arabic translation and RTL design are not shipped. |
| Dark mode | Both light/dark themes apply and survive page reloads. |
| New time zone | One account, competing/extremely distant and invalid zones; same-day repeated check-ins cannot inflate streak records. |
| Foldable screen | Approximate 320px narrow viewport. Physical foldable, hinge and Safari behaviour still need device testing. |
| Two phones | Two independent contexts signed into same account; task creation and completion reflect on reload of the other context. Existing tests cover independent accounts. |
| Delete, sign up again | Real emulator account + disposable MongoDB deletion; stale ID token rejected; same email creates a new UID with no prior tasks. |
| Banned, sign up again | While loopback IP is banned, both the old and newly registered Firebase account are denied private API access; removal restores access. |

**IP ban limitation:** this protects StudyOS HTTP/socket resources from a
blocked IP. Firebase's independent registration endpoint is not controlled
by StudyOS. It does not establish a persistent person/account ban across
different networks. A fresh identity on the same banned IP is still blocked.

**Production distinction:** the workflow validates real StudyOS code and
real HTTP/Socket.IO/browser interactions against disposable local equivalents.
It does not validate real Google login, live R2, real notification delivery,
physical devices, App Check deployment configuration or resistance to a
distributed denial-of-service attack. Continue using production monitoring,
provider dashboards, and periodic security regression checks.
