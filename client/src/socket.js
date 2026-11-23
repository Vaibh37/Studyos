import { io } from "socket.io-client";

import { auth } from "./firebase";
import { API_URL } from "./services/api";
import { getAppCheckToken } from "./services/appCheck";

// All StudyOS pages share one socket and one token-refresh schedule.
let socket = null;
let socketUserId = null;
let tokenRefreshInterval = null;
let refreshing = false;

const refreshAndReconnect = async (target, forceRefresh = true) => {
  if (target !== socket || refreshing) return;
  const user = auth.currentUser;
  if (!user || user.uid !== socketUserId) {
    disconnectSocket();
    return;
  }

  refreshing = true;
  try {
    // Firebase refresh fails if the user's refresh credentials are revoked,
    // disabled, or no longer valid. Never reuse the previous access token.
    const token = await user.getIdToken(forceRefresh);
    if (target !== socket || auth.currentUser?.uid !== socketUserId) return;
    const appCheckToken = await getAppCheckToken();
    target.auth = { token, appCheckToken };
    if (target.connected) target.disconnect();
    target.connect();
  } catch (error) {
    console.warn("Socket session refresh failed:", error?.message || error);
    if (target === socket) target.disconnect();
  } finally {
    refreshing = false;
  }
};

export const connectSocket = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User is not logged in");

  const token = await user.getIdToken();
  const appCheckToken = await getAppCheckToken();
  if (auth.currentUser?.uid !== user.uid) {
    throw new Error("Login changed while connecting");
  }

  // Never reuse a previous user's socket after switching accounts.
  if (socket && socketUserId !== user.uid) disconnectSocket();
  if (socket) {
    socket.auth = { token, appCheckToken };
    if (!socket.connected) socket.connect();
    return socket;
  }

  const connectedSocket = io(API_URL, { auth: { token, appCheckToken } });
  socket = connectedSocket;
  socketUserId = user.uid;

  connectedSocket.on("connect", () => {
    console.log("Socket connected:", connectedSocket.id);
  });

  connectedSocket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  connectedSocket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    // Server-requested disconnects may be due to an expired Firebase token.
    // Refresh once and let the server perform revocation checks again.
    if (reason === "io server disconnect" && socket === connectedSocket) {
      void refreshAndReconnect(connectedSocket, true);
    }
  });

  // Refresh ID tokens before their usual one-hour expiry; reconnecting
  // causes the server to validate current revocation and disabled state.
  tokenRefreshInterval = setInterval(() => {
    void refreshAndReconnect(connectedSocket, true);
  }, 40 * 60 * 1000);

  return connectedSocket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
  refreshing = false;
  socketUserId = null;
  if (!socket) return;
  const previous = socket;
  socket = null;
  previous.disconnect();
  previous.removeAllListeners();
};
