import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../socket";

const empty = { roomId: null, participants: [], participantId: null, offset: 0, connected: false, error: "" };

export function useStudyRoom(roomId, uid, status, subject) {
  const [state, setState] = useState(empty);
  const latest = useRef({ status, subject });
  const connection = useRef(null);
  useEffect(() => { latest.current = { status, subject: String(subject || "").slice(0, 80) }; }, [status, subject]);

  useEffect(() => {
    if (!roomId || !uid) {
      setState(empty);
      return;
    }
    let cancelled = false, blocked = false, socket = null, generation = 0, joined = false;
    setState({ ...empty, roomId });
    const receive = snapshot => {
      if (cancelled || blocked || snapshot?.roomId !== roomId || !Array.isArray(snapshot.participants)) return;
      setState(old => ({
        ...old, roomId, participants: snapshot.participants,
        offset: Number(snapshot.serverNow) - Date.now(),
      }));
    };
    const fail = message => {
      joined = false;
      setState({ ...empty, roomId, error: message });
    };
    const sendState = () => {
      if (cancelled || blocked || !joined || !socket?.connected) return;
      socket.timeout(6000).emit("study-room:state", { roomId, ...latest.current }, (error, result) => {
        if (!cancelled && joined && (error || !result?.ok)) {
          setState(old => ({ ...old, error: result?.message || "Live status could not sync. Rejoin to retry." }));
        } else if (!cancelled && joined) {
          setState(old => old.error ? { ...old, error: "" } : old);
        }
      });
    };
    const join = () => {
      if (cancelled || blocked || !socket?.connected) return;
      const attempt = ++generation;
      joined = false;
      setState(old => ({ ...old, error: "", connected: false }));
      socket.timeout(9000).emit("study-room:join", { roomId, ...latest.current }, (error, result) => {
        if (cancelled || blocked || attempt !== generation) return;
        if (error || !result?.ok) {
          blocked = true;
          fail(result?.message || "Could not join the room. Try again.");
          if (socket.connected) socket.emit("study-room:leave", { roomId });
          return;
        }
        receive(result);
        joined = true;
        setState(old => ({ ...old, connected: true, participantId: result.participantId, error: "" }));
        sendState();
      });
    };
    const disconnected = () => {
      ++generation;
      joined = false;
      if (!cancelled && !blocked) setState({ ...empty, roomId, error: "Connection lost. Reconnecting…" });
    };
    const removed = event => {
      if (event?.roomId !== roomId || cancelled) return;
      blocked = true;
      ++generation;
      fail(event.message || "You left this room.");
    };
    const connectionError = () => {
      if (!cancelled && !blocked) setState(old => ({
        ...old, connected: false, error: "Unable to connect. Check your connection.",
      }));
    };
    connectSocket().then(target => {
      if (cancelled) return;
      socket = target;
      connection.current = { sendState };
      socket.on("study-room:snapshot", receive);
      socket.on("study-room:removed", removed);
      socket.on("connect", join);
      socket.on("disconnect", disconnected);
      socket.on("connect_error", connectionError);
      if (socket.connected) join();
    }).catch(() => {
      if (!cancelled) fail("Unable to connect. Check your connection and sign in again.");
    });

    return () => {
      cancelled = true;
      connection.current = null;
      if (!socket) return;
      socket.off("study-room:snapshot", receive);
      socket.off("study-room:removed", removed);
      socket.off("connect", join);
      socket.off("disconnect", disconnected);
      socket.off("connect_error", connectionError);
      if (socket.connected) socket.emit("study-room:leave", { roomId });
    };
  }, [roomId, uid]);

  useEffect(() => { connection.current?.sendState(); }, [status, subject]);
  return state.roomId === roomId ? state : { ...empty, roomId };
}
