StudyOS Google Identity Services login patch

Google OAuth Web Client ID is already built into:
client/src/services/googleIdentity.js

Client ID:
767583378958-25g3o975bq88kraaij2o8f9eshcim76q.apps.googleusercontent.com

No .env or Vercel environment variable is required.

Changes:
- removes Firebase signInWithPopup for Google
- loads Google Identity Services
- asks Google directly for an OAuth access token
- converts that token into a Firebase Google credential
- signs into Firebase with signInWithCredential
- keeps existing Firebase email/password auth unchanged
- keeps existing backend Firebase ID-token auth unchanged
- keeps performance timing logs so the new flow can be compared

Expected new performance log labels:
- Google Identity Services ready
- Google GIS access token
- Firebase signInWithCredential

Apply over the StudyOS repository root and restart Vite.

Production prerequisite:
Google Cloud OAuth client Authorized JavaScript origins must include:
- http://localhost:5173
- https://studyos37.vercel.app
