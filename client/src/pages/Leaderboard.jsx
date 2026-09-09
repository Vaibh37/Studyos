import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Clock3,
  Crown,
  EyeOff,
  LockKeyhole,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import apiRequest from "../services/api";

// =========================================================
// HELPERS
// =========================================================

const formatMinutes = (
  minutes
) => {
  const safe =
    Math.max(
      0,
      Number(
        minutes
      ) || 0
    );

  if (
    safe < 60
  ) {
    return `${safe}m`;
  }

  const hours =
    Math.floor(
      safe / 60
    );

  const remaining =
    safe % 60;

  if (
    remaining === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
};

const getInitials = (
  name
) => {
  const words =
    String(
      name ||
        "StudyOS Student"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length ===
    0
  ) {
    return "S";
  }

  if (
    words.length ===
    1
  ) {
    return words[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();
};

const getRankIcon = (
  rank
) => {
  if (
    rank === 1
  ) {
    return (
      <Crown
        size={17}
      />
    );
  }

  if (
    rank === 2 ||
    rank === 3
  ) {
    return (
      <Medal
        size={17}
      />
    );
  }

  return null;
};

// =========================================================
// LEADERBOARD
// =========================================================

function Leaderboard() {
  const {
    isGuest,
  } = useAuth();

  const [
    leaderboard,
    setLeaderboard,
  ] = useState([]);

  const [
    profile,
    setProfile,
  ] = useState({
    displayName: "",
    isPublic: false,
  });

  const [
    currentUserRank,
    setCurrentUserRank,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // =======================================================
  // LOAD
  // =======================================================

  const loadLeaderboard =
    async (
      manual = false
    ) => {
      if (
        isGuest
      ) {
        setLoading(
          false
        );

        return;
      }

      try {
        if (
          manual
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        const [
          profileResponse,
          leaderboardResponse,
        ] =
          await Promise.all([
            apiRequest(
              "/api/leaderboard/me"
            ),

            apiRequest(
              "/api/leaderboard"
            ),
          ]);

        setProfile(
          profileResponse?.profile || {
            displayName: "",
            isPublic:
              false,
          }
        );

        setLeaderboard(
          Array.isArray(
            leaderboardResponse
              ?.leaderboard
          )
            ? leaderboardResponse
                .leaderboard
            : []
        );

        setCurrentUserRank(
          leaderboardResponse
            ?.currentUserRank ||
            null
        );
      } catch (
        loadError
      ) {
        console.error(
          "Leaderboard load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Could not load the leaderboard."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadLeaderboard(
      false
    );
  }, [
    isGuest,
  ]);

  // =======================================================
  // REFRESH AFTER SETTINGS CHANGE
  // =======================================================

  useEffect(() => {
    const refresh =
      () => {
        loadLeaderboard(
          false
        );
      };

    window.addEventListener(
      "studyos-leaderboard-settings-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "studyos-leaderboard-settings-updated",
        refresh
      );
    };
  }, [
    isGuest,
  ]);

  // =======================================================
  // CURRENT USER
  // =======================================================

  const currentUserEntry =
    useMemo(
      () =>
        leaderboard.find(
          (
            entry
          ) =>
            entry.isCurrentUser
        ) ||
        null,
      [
        leaderboard,
      ]
    );

  // =======================================================
  // PODIUM
  // =======================================================

  const podium =
    leaderboard.slice(
      0,
      3
    );

  // =======================================================
  // REST
  // =======================================================

  const remaining =
    leaderboard.slice(
      3
    );

  // =======================================================
  // GUEST
  // =======================================================

  if (
    isGuest
  ) {
    return (
      <div className="dashboard leaderboard-v1-page">

        <header className="dashboard-header leaderboard-v1-header">

          <div>

            <span className="leaderboard-v1-eyebrow">
              WEEKLY COMPETITION
            </span>

            <h1>
              Leaderboard
            </h1>

            <p>
              Weekly rankings based
              on verified StudyOS
              activity.
            </p>

          </div>

        </header>

        <section className="leaderboard-v1-guest-card">

          <div className="leaderboard-v1-guest-icon">

            <LockKeyhole
              size={30}
            />

          </div>

          <span className="leaderboard-v1-eyebrow">
            ACCOUNT REQUIRED
          </span>

          <h2>
            Global rankings require
            an account
          </h2>

          <p>
            Personal XP, levels and
            streaks still work in
            Guest mode. Sign in before
            participating in the
            global leaderboard.
          </p>

          <div className="leaderboard-v1-privacy-note">

            <ShieldCheck
              size={16}
            />

            <span>
              Guest activity is never
              submitted to the global
              ranking.
            </span>

          </div>

        </section>

      </div>
    );
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="dashboard leaderboard-v1-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="dashboard-header leaderboard-v1-header">

        <div>

          <span className="leaderboard-v1-eyebrow">
            WEEKLY COMPETITION
          </span>

          <h1>
            Leaderboard
          </h1>

          <p>
            Ranked by verified Focus
            time and completed tasks
            from the last 7 days.
          </p>

        </div>

        <button
          type="button"
          className="leaderboard-v1-refresh"
          onClick={() =>
            loadLeaderboard(
              true
            )
          }
          disabled={
            refreshing
          }
        >

          <RefreshCw
            size={15}
            className={
              refreshing
                ? "leaderboard-v1-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </header>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="leaderboard-v1-message error">

          <AlertTriangle
            size={15}
          />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ===================================================
          PRIVATE USER NOTICE
      =================================================== */}

      {!loading &&
        !profile.isPublic && (
        <section className="leaderboard-v1-fairplay">

          <EyeOff
            size={18}
          />

          <div>

            <strong>
              You are not ranked publicly
            </strong>

            <p>
              Leaderboard participation
              is currently disabled.
              Enable it from
              Settings → Leaderboard
              whenever you want to join.
            </p>

          </div>

        </section>
      )}

      {/* ===================================================
          USER STATUS
      =================================================== */}

      <section className="leaderboard-v1-status-grid">

        {/* RANK */}

        <div className="leaderboard-v1-status-card primary">

          <div className="leaderboard-v1-status-icon">

            <Trophy
              size={19}
            />

          </div>

          <div>

            <span>
              Your rank
            </span>

            <strong>
              {profile.isPublic
                ? currentUserRank
                  ? `#${currentUserRank}`
                  : "Unranked"
                : "Private"}
            </strong>

            <small>
              Last 7 days
            </small>

          </div>

        </div>

        {/* SCORE */}

        <div className="leaderboard-v1-status-card">

          <div className="leaderboard-v1-status-icon">

            <Zap
              size={19}
            />

          </div>

          <div>

            <span>
              Weekly score
            </span>

            <strong>
              {currentUserEntry
                ? `${currentUserEntry.score} XP`
                : "—"}
            </strong>

            <small>
              Verified leaderboard XP
            </small>

          </div>

        </div>

        {/* FOCUS */}

        <div className="leaderboard-v1-status-card">

          <div className="leaderboard-v1-status-icon">

            <Clock3
              size={19}
            />

          </div>

          <div>

            <span>
              Verified focus
            </span>

            <strong>
              {currentUserEntry
                ? formatMinutes(
                    currentUserEntry
                      .focusMinutes
                  )
                : "—"}
            </strong>

            <small>
              Last 7 days
            </small>

          </div>

        </div>

      </section>

      {/* ===================================================
          GLOBAL BOARD
      =================================================== */}

      <section className="dashboard-card leaderboard-v1-board">

        <div className="leaderboard-v1-board-header">

          <div>

            <span className="leaderboard-v1-eyebrow">
              LAST 7 DAYS
            </span>

            <h2>
              Global ranking
            </h2>

            <p>
              Server-verified Focus
              and task-completion XP
              with anti-spam limits.
            </p>

          </div>

          <div className="leaderboard-v1-player-count">

            <UserRound
              size={14}
            />

            <span>
              {leaderboard.length}
              {" "}
              {leaderboard.length ===
              1
                ? "student"
                : "students"}
            </span>

          </div>

        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="leaderboard-v1-loading">

            <RefreshCw
              size={20}
              className="leaderboard-v1-spin"
            />

            <span>
              Calculating rankings...
            </span>

          </div>

        ) : leaderboard.length ===
          0 ? (

          /* ===============================================
             EMPTY
          =============================================== */

          <div className="leaderboard-v1-empty">

            <Trophy
              size={28}
            />

            <strong>
              No ranked students yet
            </strong>

            <p>
              Public StudyOS users
              with verified weekly
              activity will appear
              here.
            </p>

          </div>

        ) : (

          <>
            {/* =============================================
                TOP 3
            ============================================== */}

            <div className="leaderboard-v1-podium">

              {podium.map(
                (
                  entry
                ) => (
                  <div
                    key={`${entry.rank}-${entry.displayName}`}
                    className={`leaderboard-v1-podium-card rank-${entry.rank} ${
                      entry.isCurrentUser
                        ? "current"
                        : ""
                    }`}
                  >

                    <div className="leaderboard-v1-podium-rank">

                      {getRankIcon(
                        entry.rank
                      )}

                      <span>
                        #{entry.rank}
                      </span>

                    </div>

                    <div className="leaderboard-v1-avatar">

                      {getInitials(
                        entry.displayName
                      )}

                    </div>

                    <strong>
                      {entry.displayName}
                    </strong>

                    {entry.isCurrentUser && (
                      <span className="leaderboard-v1-you">
                        YOU
                      </span>
                    )}

                    <div className="leaderboard-v1-podium-score">

                      <Zap
                        size={13}
                      />

                      <span>
                        {entry.score}
                        {" "}
                        XP
                      </span>

                    </div>

                    <small>
                      {formatMinutes(
                        entry.focusMinutes
                      )}

                      {" focus · "}

                      {
                        entry.completedTasks
                      }

                      {" tasks"}
                    </small>

                  </div>
                )
              )}

            </div>

            {/* =============================================
                RANK 4+
            ============================================== */}

            {remaining.length >
              0 && (
              <div className="leaderboard-v1-list">

                <div className="leaderboard-v1-table-head">

                  <span>
                    Rank
                  </span>

                  <span>
                    Student
                  </span>

                  <span>
                    Focus
                  </span>

                  <span>
                    Tasks
                  </span>

                  <span>
                    Weekly XP
                  </span>

                </div>

                {remaining.map(
                  (
                    entry
                  ) => (
                    <div
                      key={`${entry.rank}-${entry.displayName}`}
                      className={`leaderboard-v1-row ${
                        entry.isCurrentUser
                          ? "current"
                          : ""
                      }`}
                    >

                      <div className="leaderboard-v1-rank">

                        #{entry.rank}

                      </div>

                      <div className="leaderboard-v1-user">

                        <div className="leaderboard-v1-mini-avatar">

                          {getInitials(
                            entry.displayName
                          )}

                        </div>

                        <strong>
                          {entry.displayName}
                        </strong>

                        {entry.isCurrentUser && (
                          <span>
                            YOU
                          </span>
                        )}

                      </div>

                      <div className="leaderboard-v1-cell">

                        <Clock3
                          size={13}
                        />

                        {formatMinutes(
                          entry.focusMinutes
                        )}

                      </div>

                      <div className="leaderboard-v1-cell">

                        <Sparkles
                          size={13}
                        />

                        {
                          entry.completedTasks
                        }

                      </div>

                      <div className="leaderboard-v1-score">

                        <Zap
                          size={13}
                        />

                        <strong>
                          {entry.score}
                          {" "}
                          XP
                        </strong>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </>
        )}

      </section>

      {/* ===================================================
          FAIR PLAY
      =================================================== */}

      <section className="leaderboard-v1-fairplay">

        <ShieldCheck
          size={18}
        />

        <div>

          <strong>
            Fair-play ranking
          </strong>

          <p>
            StudyOS calculates ranking
            scores on the server and
            limits Focus and task XP
            to reduce trivial score
            farming.
          </p>

        </div>

      </section>

    </div>
  );
}

export default Leaderboard;