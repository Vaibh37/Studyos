import {
  auth,
} from "../firebase";

// =========================================================
// API BASE URL
// =========================================================

export const API_URL =
  (
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000"
  ).replace(
    /\/+$/,
    ""
  );

// =========================================================
// TOKEN COALESCING
//
// Several pages can start multiple requests at the same
// time. Firebase already caches ID tokens, but every caller
// still asks Firebase separately.
//
// Share one in-flight token read across parallel requests.
// =========================================================

let tokenPromise =
  null;

const getRequestToken =
  async () => {
    const user =
      auth.currentUser;

    if (!user) {
      return null;
    }

    if (
      tokenPromise
    ) {
      return tokenPromise;
    }

    tokenPromise =
      user
        .getIdToken()
        .finally(
          () => {
            tokenPromise =
              null;
          }
        );

    return tokenPromise;
  };

// =========================================================
// API REQUEST
// =========================================================

export const apiRequest =
  async (
    path,
    options = {}
  ) => {
    const headers = {
      ...options.headers,
    };

    // =====================================================
    // JSON BODY
    // =====================================================

    if (
      options.body &&
      !headers[
        "Content-Type"
      ]
    ) {
      headers[
        "Content-Type"
      ] =
        "application/json";
    }

    // =====================================================
    // FIREBASE AUTH TOKEN
    // =====================================================

    const token =
      await getRequestToken();

    if (
      token
    ) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    // =====================================================
    // REQUEST
    // =====================================================

    const response =
      await fetch(
        `${API_URL}${path}`,
        {
          ...options,
          headers,
        }
      );

    // =====================================================
    // RESPONSE BODY
    // =====================================================

    let data =
      null;

    try {
      data =
        await response.json();
    } catch {
      data =
        null;
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (
      !response.ok
    ) {
      throw new Error(
        data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  };

export default apiRequest;
