import { getToken } from "firebase/app-check";
import { appCheck } from "../firebase";

// Not configured until a Firebase web App Check site key is deployed.
// App Check caches tokens and refreshes them itself.
export async function getAppCheckToken() {
  if (!appCheck) return null;
  try {
    const { token } = await getToken(appCheck);
    return token || null;
  } catch {
    // Server enforcement is a separate, explicit rollout step.
    return null;
  }
}
