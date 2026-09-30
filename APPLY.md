# StudyOS proper routing pass

This patch only changes routing / shell integration and adds safe backend system endpoints.

## Frontend routes

Public:
- `/`
- `/get-started`
- `/privacy`
- `/terms`
- `/contact`

Application:
- `/app` -> redirects to saved startup page
- `/app/dashboard`
- `/app/tasks`
- `/app/subjects`
- `/app/notes`
- `/app/calendar`
- `/app/focus`
- `/app/progress`
- `/app/leaderboard`
- `/app/settings`

Behavior:
- signed-out visitor opening `/` sees marketing
- authenticated/returning guest opening `/` goes to `/app`
- signed-out access to `/app/*` goes to `/get-started`
- browser refresh/back/forward now tracks real app URLs
- sidebar navigation is URL-based
- existing startup-page preference is preserved
- individual app pages are lazy-loaded

## Backend system endpoints

- `GET /`
- `GET /api`
- `GET /api/health`
- `GET /api/health/db`
- `GET /api/health/auth`
- `GET /api/status`
- `GET /api/uptime`
- `GET /api/version`

Existing API mounts remain unchanged:
- `/api/auth`
- `/api/tasks`
- `/api/subjects`
- `/api/notes`
- `/api/events`
- `/api/study-sessions`
- `/api/leaderboard`

The status endpoints expose only safe operational state. No credentials, Mongo URI, Firebase secrets, emails, tokens, or env values are returned.

## Apply

From Downloads:

```powershell
Expand-Archive ".\studyos-routing-pass.zip" ".\studyos-routing-pass" -Force
Copy-Item ".\studyos-routing-pass\*" "C:\Dev\Studyos" -Recurse -Force
```

Restart both processes.

Backend:

```powershell
cd C:\Dev\Studyos\server
npm run dev
```

Frontend:

```powershell
cd C:\Dev\Studyos\client
npm run dev
```

## Test frontend

Open these manually:

```text
http://localhost:5173/app
http://localhost:5173/app/dashboard
http://localhost:5173/app/tasks
http://localhost:5173/app/subjects
http://localhost:5173/app/notes
http://localhost:5173/app/calendar
http://localhost:5173/app/focus
http://localhost:5173/app/progress
http://localhost:5173/app/leaderboard
http://localhost:5173/app/settings
```

Refresh the browser while on `/app/focus` or `/app/tasks`. It should stay on that route.

Use Back / Forward after moving around the sidebar.

## Test backend

```text
http://localhost:5000/
http://localhost:5000/api
http://localhost:5000/api/health
http://localhost:5000/api/health/db
http://localhost:5000/api/health/auth
http://localhost:5000/api/status
http://localhost:5000/api/uptime
http://localhost:5000/api/version
```

Do not push until the route behavior is visually checked.
