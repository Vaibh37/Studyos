import { useEffect, useRef, useState } from "react";
import { normalizeDesk } from "../services/studyDesk";
import { connectSocket } from "../socket";

const empty = { roomId: null, participants: [], participantId: null, offset: 0, connected: false, error: "", removed: false, deskProgress: null, deskEvent: null, deskError: "" };

export function useStudyRoom(roomId, uid, status, subject, desk) {
  const [state, setState] = useState(empty);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ status, subject });
  const connection = useRef(null);
  const latestDesk = useRef(desk);
  useEffect(() => { latestDesk.current = desk; }, [desk]);
  useEffect(() => { latest.current = { status, subject: String(subject || "").slice(0, 80) }; }, [status, subject]);

  useEffect(() => {
    if (!roomId || !uid) {
      setState(empty);
      return;
    }
    let cancelled = false, blocked = false, socket = null, generation = 0, joined = false, progress = null, eventTimeout = null;
    setState({ ...empty, roomId });
    const receive = snapshot => {
      if (cancelled || blocked || snapshot?.roomId !== roomId || !Array.isArray(snapshot.participants)) return;
      setState(old => ({
        ...old, roomId, participants: snapshot.participants,
        offset: Number(snapshot.serverNow) - Date.now(),
      }));
    };
    const fail = (message, removed = false) => {
      joined = false;
      setState({ ...empty, roomId, error: message, removed });
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
    const sendDesk = () => {
      if (cancelled || blocked || !joined || progress === null || !socket?.connected) return;
      socket.timeout(6000).emit("study-room:desk", { roomId, ...normalizeDesk(latestDesk.current, progress) }, (error, result) => {
        if (!cancelled && joined) setState(old => ({ ...old, deskError: error || !result?.ok ? result?.message || "Desk could not sync. Try again." : "" }));
      });
    };
    const encourage = (participantId, kind) => {
      if (cancelled || blocked || !joined || progress === null || !socket?.connected) return Promise.resolve({ ok: false });
      return new Promise(resolve => socket.timeout(6000).emit("study-room:encourage", { roomId, participantId, kind }, (error, result) => resolve(error ? { ok: false } : result)));
    };
    const updatedProgress = event => {
      if (cancelled || blocked || !joined || event?.roomId !== roomId || !Number.isInteger(event.progress)) return;
      progress = Math.max(0, Math.min(10, event.progress));
      setState(old => ({ ...old, deskProgress: progress }));
      sendDesk();
    };
    const receiveDeskEvent = (event, kind) => {
      if (cancelled || blocked || !joined || event?.roomId !== roomId || typeof event.participantId !== "string") return;
      clearTimeout(eventTimeout);
      setState(old => ({ ...old, deskEvent: { ...event, kind } }));
      eventTimeout = setTimeout(() => { if (!cancelled) setState(old => ({ ...old, deskEvent: null })); }, 3500);
    };
    const encouragement = event => { if (latestDesk.current?.encouragement && ["wave", "thumb"].includes(event?.kind)) receiveDeskEvent(event, event.kind); };
    const milestone = event => receiveDeskEvent(event, "saved");
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
        progress = Number.isInteger(result.deskProgress) ? Math.max(0, Math.min(10, result.deskProgress)) : null;
        setState(old => ({ ...old, connected: true, participantId: result.participantId, error: "", deskProgress: progress }));
        sendState();
        sendDesk();
      });
    };
    const disconnected = () => {
      ++generation;
      clearTimeout(eventTimeout);
      joined = false;
      if (!cancelled && !blocked) setState({ ...empty, roomId, error: "Connection lost. Reconnecting…" });
    };
    const removed = event => {
      if (event?.roomId !== roomId || cancelled) return;
      blocked = true;
      ++generation;
      fail(event.message || "You left this room.", true);
    };
    const connectionError = () => {
      if (!cancelled && !blocked) setState(old => ({
        ...old, connected: false, error: "Unable to connect. Check your connection.",
      }));
    };
    connectSocket().then(target => {
      if (cancelled) return;
      socket = target;
      connection.current = { sendState, sendDesk, encourage };
      socket.on("study-room:snapshot", receive);
      socket.on("study-room:removed", removed);
      socket.on("study-room:desk-progress", updatedProgress);
      socket.on("study-room:encouragement", encouragement);
      socket.on("study-room:milestone", milestone);
      socket.on("connect", join);
      socket.on("disconnect", disconnected);
      socket.on("connect_error", connectionError);
      if (socket.connected) join();
    }).catch(() => {
      if (!cancelled) fail("Unable to connect. Check your connection and sign in again.");
    });

    return () => {
      cancelled = true;
      clearTimeout(eventTimeout);
      connection.current = null;
      if (!socket) return;
      socket.off("study-room:snapshot", receive);
      socket.off("study-room:removed", removed);
      socket.off("study-room:desk-progress", updatedProgress);
      socket.off("study-room:encouragement", encouragement);
      socket.off("study-room:milestone", milestone);
      socket.off("connect", join);
      socket.off("disconnect", disconnected);
      socket.off("connect_error", connectionError);
      if (socket.connected) socket.emit("study-room:leave", { roomId });
    };
  }, [roomId, uid, attempt]);

  useEffect(() => { connection.current?.sendState(); }, [status, subject]);
  useEffect(() => { connection.current?.sendDesk(); }, [desk]);
  return { encourage: (id, kind) => connection.current?.encourage(id, kind) || Promise.resolve({ ok: false }), retryDesk: () => connection.current?.sendDesk(), ...(state.roomId === roomId ? state : { ...empty, roomId }), retry: () => setAttempt(n => n + 1) };
}
