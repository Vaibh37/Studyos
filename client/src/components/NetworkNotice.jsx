import { useEffect, useState } from "react";
import { AlertCircle } from "./icons";

export default function NetworkNotice() {
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return <div className="ws-network-notice" role="status"><AlertCircle size={18} aria-hidden="true" /><span>You’re offline. Reconnect to load or save cloud study data.</span></div>;
}
