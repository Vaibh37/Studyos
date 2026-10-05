import {
  io,
} from "socket.io-client";

import {
  auth,
} from "./firebase";

// =========================================
// SOCKET INSTANCE
// =========================================

let socket =
  null;

// =========================================
// CONNECT SOCKET
// =========================================

export const connectSocket =
  async () => {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "User is not logged in"
      );
    }

    const token =
      await user.getIdToken();

    if (
      socket &&
      socket.connected
    ) {
      return socket;
    }

    socket =
      io(
        "http://localhost:5000",
        {
          auth: {
            token,
          },
        }
      );

    socket.on(
      "connect",
      () => {
        console.log(
          "Socket connected:",
          socket.id
        );
      }
    );

    socket.on(
      "connect_error",
      (
        error
      ) => {
        console.error(
          "Socket connection error:",
          error.message
        );
      }
    );

    socket.on(
      "disconnect",
      (
        reason
      ) => {
        console.log(
          "Socket disconnected:",
          reason
        );
      }
    );

    return socket;
  };

// =========================================
// GET SOCKET
// =========================================

export const getSocket =
  () => {
    return socket;
  };

// =========================================
// DISCONNECT SOCKET
// =========================================

export const disconnectSocket =
  () => {
    if (!socket) {
      return;
    }

    socket.disconnect();

    socket =
      null;
  };