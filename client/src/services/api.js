import { auth } from "../firebase";
import { getAppCheckToken } from "./appCheck";
import { createStudyApiClient } from "./studyApiClient";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const client = createStudyApiClient({
  apiUrl: API_URL,
  getUser: () => auth.currentUser,
  getAppCheckToken,
  isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
});

export const { apiRequest, readStudyData, readDashboardData, setStudyDataScope, invalidateStudyData } = client;
if (typeof window !== "undefined") window.addEventListener("online", invalidateStudyData);
export default apiRequest;
