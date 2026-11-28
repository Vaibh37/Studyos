import { useEffect, useState } from "react";
import { connectSocket } from "../socket";

const initial = { scope: null, rooms: {}, connected: false, error: "" };

export function useStudyRoomDirectory(uid, enabled, groupIds) {
  const groupKey = [...new Set(groupIds)].sort().slice(0, 100).join(",");
  const scope = `${uid || ""}:${groupKey}`;
  const [state, setState] = useState(initial);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid || !enabled) return;
    let stopped = false, socket, generation = 0;
    setState({ ...initial, scope });
    const receive = summary => {
      if (stopped || !summary?.roomId) return;
      setState(old => ({ ...old, scope, rooms: { ...old.rooms, [summary.roomId]: summary } }));
    };
    const removed = ({ roomId } = {}) => {
      if (stopped) return;
      setState(old => {
        const rooms = { ...old.rooms };
        delete rooms[roomId];
        return { ...old, rooms };
      });
    };
    const subscribe = () => {
      if (stopped || !socket.connected) return;
      const current = ++generation;
      setState({ ...initial, scope });
      socket.timeout(8000).emit("study-room:directory:subscribe", { groupIds: groupKey ? groupKey.split(",") : [] }, (error, response) => {
        if (stopped || generation !== current) return;
        if (error || !response?.ok || !Array.isArray(response.rooms)) {
          setState({ ...initial, scope, error: "Live room counts are temporarily unavailable." });
          return;
        }
        const rooms = Object.fromEntries(response.rooms.map(summary => [summary.roomId, summary]));
        setState({ scope, rooms, connected: true, error: "" });
      });
    };
    const disconnect = () => {
      generation++;
      if (!stopped) setState({ ...initial, scope, error: "Reconnecting live room counts…" });
    };
    const connectionError = () => {
      if (!stopped) setState({ ...initial, scope, error: "Live room counts are temporarily unavailable." });
    };
    connectSocket().then(target => {
      if (stopped) return;
      socket = target;
      socket.on("study-room:occupancy", receive);
      socket.on("study-room:occupancy:removed", removed);
      socket.on("connect", subscribe);
      socket.on("disconnect", disconnect);
      socket.on("connect_error", connectionError);
      if (socket.connected) subscribe();
    }).catch(connectionError);

    return () => {
      stopped = true;
      if (!socket) return;
      socket.off("study-room:occupancy", receive);
      socket.off("study-room:occupancy:removed", removed);
      socket.off("connect", subscribe);
      socket.off("disconnect", disconnect);
      socket.off("connect_error", connectionError);
      if (socket.connected) socket.emit("study-room:directory:unsubscribe", {});
    };
  }, [uid, enabled, groupKey, attempt]);

  return { ...(enabled && state.scope === scope ? state : initial), refresh: () => setAttempt(n => n + 1) };
}
