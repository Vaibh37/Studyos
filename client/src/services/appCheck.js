import app from "../firebase";

// Keep reCAPTCHA and App Check code off public/guest startup paths. The
// configured provider is still initialized before any API/socket token is
// requested, and its normal automatic token refresh stays enabled.
let initialization;
function getAppCheck() {
  if (!initialization) {
    initialization = import("firebase/app-check").then(sdk => ({
      sdk,
      instance: sdk.initializeAppCheck(app, {
        provider: new sdk.ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      }),
    })).catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

export async function getAppCheckToken() {
  if (!import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY) return null;
  try {
    const { sdk, instance } = await getAppCheck();
    const { token } = await sdk.getToken(instance);
    return token || null;
  } catch {
    // Server enforcement still rejects missing or invalid App Check tokens.
    return null;
  }
}
