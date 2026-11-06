
import { io } from "socket.io-client";

import { auth } from "./firebase";
import { API_URL } from "./services/api";

// =========================================
// SOCKET INSTANCE
// =========================================

let socket = null;

// =========================================
// CONNECT SOCKET
// =========================================

export const connectSocket = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in");
  }

  const token = await user.getIdToken();

  if (socket && socket.connected) {
    return socket;
  }

  // Use the configured API URL instead of localhost.
  // Local: http://localhost:5000
  // Production: VITE_API_URL from Vercel

  socket = io(API_URL, {
    auth: {
      token,
    },
  });

  socket.on("connect", () => {
    console.log(
      "Socket connected:",
      socket.id
    );
  });

  socket.on("connect_error", (error) => {
    console.error(
      "Socket connection error:",
      error.message
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      reason
    );
  });

  return socket;
};

// =========================================
// GET SOCKET
// =========================================

export const getSocket = () => {
  return socket;
};

// =========================================
// DISCONNECT SOCKET
// =========================================

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
};
