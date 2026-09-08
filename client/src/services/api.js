import {
  auth,
} from "../firebase";

// =========================================================
// API BASE URL
// =========================================================
//
// LOCAL:
// Falls back to http://localhost:5000
//
// PRODUCTION:
// Set:
//
// VITE_API_URL=https://your-backend-domain.com
//
// in the frontend environment variables.
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
// API REQUEST
// =========================================================

export const apiRequest =
  async (
    path,
    options = {}
  ) => {
    const user =
      auth.currentUser;

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

    if (user) {
      const token =
        await user.getIdToken();

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

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  };

export default apiRequest;