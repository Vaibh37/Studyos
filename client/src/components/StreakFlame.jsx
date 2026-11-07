
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { ArrowRight, X } from "lucide-react";
import { useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import apiRequest from "../services/api";

import "../styles/streak-flame.css";

const PREFIX = "studyos-visit-streak-v1";
const DAY_MS = 86400000;

/*
  Each shape has matching SVG commands.

  The SVG morphs between these paths continuously.
  This bends the actual flame instead of simply
  rotating a static icon.
*/

const OUTER_SHAPES = [
  "M50 6 C40 24 57 36 47 51 C43 40 28 30 34 15 C16 37 12 53 16 75 C20 100 37 115 53 115 C77 114 90 94 85 72 C82 54 70 42 74 19 C61 31 62 42 58 49 C50 38 47 25 50 6 Z",
  "M44 7 C35 26 53 38 44 54 C39 42 24 34 30 18 C13 40 12 56 19 77 C26 100 42 114 57 114 C80 113 91 93 83 69 C78 51 68 43 68 18 C58 32 65 46 56 53 C48 40 43 22 44 7 Z",
  "M55 6 C43 21 67 34 50 51 C46 36 31 28 37 12 C18 31 12 50 17 72 C21 99 36 115 53 115 C74 116 89 96 87 73 C88 52 72 40 79 18 C65 29 61 41 62 48 C55 37 54 21 55 6 Z",
  "M50 6 C40 24 57 36 47 51 C43 40 28 30 34 15 C16 37 12 53 16 75 C20 100 37 115 53 115 C77 114 90 94 85 72 C82 54 70 42 74 19 C61 31 62 42 58 49 C50 38 47 25 50 6 Z",
];

const MIDDLE_SHAPES = [
  "M50 43 C43 60 56 66 47 79 C44 70 39 65 41 55 C30 68 30 83 35 94 C40 107 48 111 54 111 C68 111 75 99 72 86 C70 75 62 66 63 52 C55 61 56 71 53 76 C48 68 49 55 50 43 Z",
  "M46 42 C38 61 54 68 44 82 C41 73 36 65 38 56 C28 69 31 84 37 97 C43 108 51 111 57 110 C71 109 76 97 70 83 C68 72 59 63 59 51 C53 63 56 73 52 79 C46 67 45 55 46 42 Z",
  "M55 45 C46 59 61 66 50 80 C46 69 43 63 45 52 C32 66 29 83 35 96 C40 107 50 112 56 111 C69 110 76 98 74 85 C72 74 66 66 67 54 C58 63 57 73 57 78 C51 67 53 56 55 45 Z",
  "M50 43 C43 60 56 66 47 79 C44 70 39 65 41 55 C30 68 30 83 35 94 C40 107 48 111 54 111 C68 111 75 99 72 86 C70 75 62 66 63 52 C55 61 56 71 53 76 C48 68 49 55 50 43 Z",
];

const CORE_SHAPES = [
  "M52 76 C44 84 45 93 47 101 C50 108 56 110 61 106 C69 101 67 91 60 84 C58 92 54 94 52 76 Z",
  "M47 74 C42 84 45 95 49 102 C54 109 60 109 64 105 C70 98 64 90 57 82 C56 93 51 95 47 74 Z",
  "M55 78 C47 83 44 92 48 102 C52 109 57 111 62 106 C70 99 70 91 62 81 C60 91 57 96 55 78 Z",
  "M52 76 C44 84 45 93 47 101 C50 108 56 110 61 106 C69 101 67 91 60 84 C58 92 54 94 52 76 Z",
];

function LivingFlame({ large = false }) {
  const rawId = useId().replace(/:/g, "");
  const outerId = `sf2-outer-${rawId}`;
  const middleId = `sf2-middle-${rawId}`;

  return (
    <svg
      className={`sf2-flame-svg ${
        large ? "sf2-flame-large" : "sf2-flame-small"
      }`}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={outerId}
          x1="0"
          y1="1"
          x2="0"
          y2="0"
        >
          <stop offset="0%" stopColor="#f04416" />
          <stop offset="45%" stopColor="#ff791d" />
          <stop offset="100%" stopColor="#ffbf45" />
        </linearGradient>

        <linearGradient
          id={middleId}
          x1="0"
          y1="1"
          x2="0"
          y2="0"
        >
          <stop offset="0%" stopColor="#ff9a28" />
          <stop offset="70%" stopColor="#ffd34f" />
          <stop offset="100%" stopColor="#ffed9a" />
        </linearGradient>
      </defs>

      {/* Outer fire: slow wind-driven movement */}

      <g className="sf2-outer-layer">
        <path
          d={OUTER_SHAPES[0]}
          fill={`url(#${outerId})`}
        >
          <animate
            attributeName="d"
            values={OUTER_SHAPES.join(";")}
            dur="2.1s"
            calcMode="spline"
            keyTimes="0;0.33;0.67;1"
            keySplines="
              0.42 0 0.58 1;
              0.42 0 0.58 1;
              0.42 0 0.58 1
            "
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Golden inner fire: faster and independent */}

      <g className="sf2-middle-layer">
        <path
          d={MIDDLE_SHAPES[0]}
          fill={`url(#${middleId})`}
        >
          <animate
            attributeName="d"
            values={MIDDLE_SHAPES.join(";")}
            dur="1.45s"
            calcMode="spline"
            keyTimes="0;0.33;0.67;1"
            keySplines="
              0.42 0 0.58 1;
              0.42 0 0.58 1;
              0.42 0 0.58 1
            "
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Pale core: flickers inside the flame */}

      <g className="sf2-core-layer">
        <path
          d={CORE_SHAPES[0]}
          fill="#fff2ae"
        >
          <animate
            attributeName="d"
            values={CORE_SHAPES.join(";")}
            dur="1.05s"
            calcMode="spline"
            keyTimes="0;0.33;0.67;1"
            keySplines="
              0.42 0 0.58 1;
              0.42 0 0.58 1;
              0.42 0 0.58 1
            "
            repeatCount="indefinite"
          />

          <animate
            attributeName="opacity"
            values="0.86;1;0.76;0.86"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
}

function dateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) {
    return NaN;
  }

  const [year, month, day] = key.split("-").map(Number);

  return Date.UTC(year, month - 1, day) / 86400000;
}

function readGuestRecord() {
  try {
    const data = JSON.parse(
      localStorage.getItem(`${PREFIX}:guest`) || "null"
    );

    if (data && Number.isFinite(data.count)) {
      return data;
    }
  } catch {
    // Local storage may be unavailable.
  }

  return {
    count: 0,
    best: 0,
    lastDate: "",
  };
}

function guestCheckIn() {
  const previous = readGuestRecord();
  const today = dateKey();

  if (previous.lastDate === today) {
    return {
      ...previous,
      updated: false,
    };
  }

  const consecutive =
    dayNumber(today) - dayNumber(previous.lastDate) === 1;

  const count = consecutive ? previous.count + 1 : 1;

  const next = {
    count,
    best: Math.max(previous.best || 0, count),
    lastDate: today,
  };

  try {
    localStorage.setItem(
      `${PREFIX}:guest`,
      JSON.stringify(next)
    );
  } catch {
    // Count remains available this session.
  }

  return {
    ...next,
    updated: true,
  };
}

const PARTICLES = Array.from(
  { length: 16 },
  (_, index) => ({
    angle: `${index * 22.5}deg`,
    delay: `${index * 32}ms`,
  })
);

export default function StreakFlame() {
  const { mode, loading, firebaseUser } = useAuth();
  const { pathname } = useLocation();

  const inApp = /^\/app(?:\/|$)/.test(pathname);

  const userId =
    mode === "authenticated" ? firebaseUser?.uid : null;

  const ready =
    !loading &&
    inApp &&
    (mode === "guest" ||
      (mode === "authenticated" && Boolean(userId)));

  const [record, setRecord] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [returning, setReturning] = useState(false);
  const [travel, setTravel] = useState({ x: 0, y: 0 });
  const [burst, setBurst] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  const triggerRef = useRef(null);
  const stageRef = useRef(null);
  const returnTimer = useRef(null);
  const closingRef = useRef(false);

  const reveal = useCallback((kind) => {
    clearTimeout(returnTimer.current);

    closingRef.current = false;
    setReturning(false);
    setTravel({ x: 0, y: 0 });
    setBurst((value) => value + 1);
    setCelebration(kind);
  }, []);

  const dismiss = useCallback(() => {
    if (!celebration || closingRef.current) return;

    closingRef.current = true;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      setCelebration(null);
      closingRef.current = false;
      return;
    }

    const stage = stageRef.current?.getBoundingClientRect();
    const button = triggerRef.current?.getBoundingClientRect();

    if (stage && button) {
      setTravel({
        x:
          button.left +
          button.width / 2 -
          (stage.left + stage.width / 2),

        y:
          button.top +
          button.height / 2 -
          (stage.top + stage.height / 2),
      });
    }

    setReturning(true);

    returnTimer.current = window.setTimeout(() => {
      setCelebration(null);
      setReturning(false);
      closingRef.current = false;
    }, 520);
  }, [celebration]);

  useEffect(() => {
    if (!celebration) return;

    const timer = window.setTimeout(dismiss, 5500);

    return () => window.clearTimeout(timer);
  }, [celebration, dismiss]);

  useEffect(() => {
    if (!celebration) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [celebration, dismiss]);

  useEffect(() => {
    if (!ready) {
      setRecord(null);
      setCelebration(null);
      setUnavailable(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let lastAttemptDate = "";
    let lastAttemptTime = 0;

    async function checkIn(showCelebration = false) {
      const today = dateKey();

      if (inFlight) return;

      if (
        !showCelebration &&
        lastAttemptDate === today &&
        Date.now() - lastAttemptTime < 120000
      ) {
        return;
      }

      inFlight = true;
      lastAttemptDate = today;
      lastAttemptTime = Date.now();

      try {
        let result;

        if (mode === "guest") {
          result = guestCheckIn();
        } else {
          let timeZone = "UTC";

          try {
            timeZone =
              Intl.DateTimeFormat().resolvedOptions()
                .timeZone || "UTC";
          } catch {
            // Use UTC.
          }

          result = await apiRequest(
            "/api/auth/streak/check-in",
            {
              method: "POST",
              body: JSON.stringify({ timeZone }),
            }
          );
        }

        if (cancelled) return;

        setRecord(result);
        setUnavailable(false);

        if (result.updated) {
          reveal("updated");
        } else if (showCelebration) {
          reveal("welcome");
        }
      } catch (error) {
        console.error("Streak check-in failed:", error);

        if (!cancelled) {
          setUnavailable(true);
          if (showCelebration) reveal("error");
        }
      } finally {
        inFlight = false;
      }
    }

    checkIn(true);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkIn(false);
      }
    };

    const onRetry = () => {
      lastAttemptTime = 0;
      checkIn(true);
    };

    const onStorage = (event) => {
      if (
        mode === "guest" &&
        event.key === `${PREFIX}:guest`
      ) {
        setRecord(readGuestRecord());
      }
    };

    window.addEventListener("focus", onVisible);
    window.addEventListener("storage", onStorage);
    window.addEventListener("studyos-streak-retry", onRetry);
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(onVisible, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("studyos-streak-retry", onRetry);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [ready, mode, userId, reveal]);

  useEffect(() => {
    return () => clearTimeout(returnTimer.current);
  }, []);

  if (!ready) return null;

  const days = record?.count || 0;
  const best = record?.best || days;

  const title =
    celebration === "updated"
      ? "Streak updated!"
      : celebration === "welcome"
        ? "Welcome back!"
        : celebration === "error"
          ? "Check-in unavailable"
          : "Keep the flame alive!";

  const handleTrigger = () => {
    if (unavailable && !record) {
      window.dispatchEvent(
        new Event("studyos-streak-retry")
      );
      return;
    }

    reveal("replay");
  };

  return (
    <>
      {/* Always-moving top-right flame */}

      <button
        ref={triggerRef}
        type="button"
        className={`sf2-trigger${
          celebration ? " is-hidden" : ""
        }`}
        onClick={handleTrigger}
        aria-label={`Daily visit streak: ${days} days. Show celebration`}
      >
        <span className="sf2-mini-fire">
          <LivingFlame />
        </span>

        <strong>{record ? days : "?"}</strong>
      </button>

      {/* Center celebration */}

      {celebration && (
        <div
          className={`sf2-overlay${
            returning ? " is-returning" : ""
          }`}
          onClick={dismiss}
        >
          <div
            ref={stageRef}
            className="sf2-stage"
            style={{
              "--sf2-x": `${travel.x}px`,
              "--sf2-y": `${travel.y}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Daily streak celebration"
            onClick={dismiss}
          >
            <button
              type="button"
              className="sf2-close"
              onClick={dismiss}
              aria-label="Close celebration"
            >
              <X size={19} />
            </button>

            <div className="sf2-fire-scene" key={burst}>
              <div className="sf2-ring sf2-ring-one" />
              <div className="sf2-ring sf2-ring-two" />
              <div className="sf2-big-glow" />

              <LivingFlame large />

              <div className="sf2-particles" aria-hidden="true">
                {PARTICLES.map((particle, index) => (
                  <i
                    key={index}
                    style={{
                      "--angle": particle.angle,
                      "--delay": particle.delay,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="sf2-kicker">
              DAILY CHECK-IN
            </div>

            <h2>{title}</h2>

            {record ? (
              <>
                <div className="sf2-count">
                  <strong>{days}</strong>
                  <span>
                    {days === 1 ? "day" : "days"}
                  </span>
                </div>

                <p className="sf2-subtitle">
                  {days === 1
                    ? "Your journey starts today."
                    : "You're keeping the momentum going."}
                </p>

                <p className="sf2-best">
                  Best streak: {best}{" "}
                  {best === 1 ? "day" : "days"}
                </p>
              </>
            ) : (
              <p className="sf2-subtitle">
                {unavailable
                  ? "Reconnect to update your streak."
                  : "Loading your streak..."}
              </p>
            )}

            <button
              type="button"
              className="sf2-continue"
              onClick={dismiss}
            >
              Keep going
              <ArrowRight size={19} />
            </button>

            <span className="sf2-hint">
              Tap to return to StudyOS
            </span>
          </div>
        </div>
      )}
    </>
  );
}
