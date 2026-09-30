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

import "../styles/leaderboard-v2.css";


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
            isPublic: false,
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
  // REFRESH AFTER SETTINGS
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
      <div className="v2l-page">

        <header className="v2l-header">

          <div>

            <span className="v2l-eyebrow">
              Weekly competition
            </span>

            <h1>
              Leaderboard
            </h1>

            <p>
              Compare weekly StudyOS activity
              with students who choose to
              participate publicly.
            </p>

          </div>

        </header>


        <section className="v2l-guest">

          <span className="v2l-guest-icon">

            <LockKeyhole
              size={28}
            />

          </span>


          <span className="v2l-eyebrow">
            Account required
          </span>


          <h2>
            Sign in to join the leaderboard
          </h2>


          <p>
            Personal XP, levels and streaks
            still work in Guest mode. A StudyOS
            account is required before you can
            appear in the global ranking.
          </p>


          <div className="v2l-guest-note">

            <ShieldCheck
              size={17}
            />

            <span>
              Guest activity stays outside the
              public leaderboard.
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
    <div className="v2l-page">

      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="v2l-header">

        <div>

          <span className="v2l-eyebrow">
            Weekly competition
          </span>

          <h1>
            Leaderboard
          </h1>

          <p>
            Rankings are calculated from recent
            Focus activity and completed tasks.
          </p>

        </div>


        <button
          type="button"
          className="v2l-refresh"
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
            size={16}
            className={
              refreshing
                ? "v2l-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}

        </button>

      </header>


      {/* ===================================================
          ERROR
          =================================================== */}

      {error && (
        <div className="v2l-error">

          <AlertTriangle
            size={17}
          />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* ===================================================
          PRIVATE NOTICE
          =================================================== */}

      {!loading &&
        !profile.isPublic && (
        <section className="v2l-private">

          <span className="v2l-private-icon">

            <EyeOff
              size={19}
            />

          </span>


          <div>

            <strong>
              Your leaderboard profile is private
            </strong>

            <p>
              You are not currently shown in the
              public ranking. You can change this
              from Settings → Leaderboard.
            </p>

          </div>

        </section>
      )}


      {/* ===================================================
          YOUR STATUS
          =================================================== */}

      <section className="v2l-status">

        <StatusCard
          icon={
            <Trophy
              size={19}
            />
          }
          label="Your rank"
          value={
            profile.isPublic
              ? currentUserRank
                ? `#${currentUserRank}`
                : "Unranked"
              : "Private"
          }
          detail="Current weekly position"
        />


        <StatusCard
          icon={
            <Zap
              size={19}
            />
          }
          label="Weekly score"
          value={
            currentUserEntry
              ? `${currentUserEntry.score} XP`
              : "—"
          }
          detail="Leaderboard score"
        />


        <StatusCard
          icon={
            <Clock3
              size={19}
            />
          }
          label="Focus"
          value={
            currentUserEntry
              ? formatMinutes(
                  currentUserEntry
                    .focusMinutes
                )
              : "—"
          }
          detail="Last 7 days"
        />

      </section>


      {/* ===================================================
          BOARD
          =================================================== */}

      <section className="v2l-board">

        <div className="v2l-board-header">

          <div>

            <span className="v2l-eyebrow">
              Last 7 days
            </span>

            <h2>
              Global ranking
            </h2>

            <p>
              Weekly score combines eligible
              StudyOS Focus and task activity.
            </p>

          </div>


          <div className="v2l-player-count">

            <UserRound
              size={15}
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

          <div className="v2l-loading">

            <RefreshCw
              size={22}
              className="v2l-spin"
            />

            <strong>
              Calculating rankings
            </strong>

            <span>
              Loading weekly StudyOS activity.
            </span>

          </div>

        ) : leaderboard.length ===
          0 ? (

          <div className="v2l-empty">

            <span className="v2l-empty-icon">

              <Trophy
                size={28}
              />

            </span>

            <strong>
              No ranked students yet
            </strong>

            <p>
              Public StudyOS users with recent
              leaderboard activity will appear
              here.
            </p>

          </div>

        ) : (
          <>

            {/* =============================================
                TOP 3
                ============================================= */}

            <section className="v2l-podium">

              {podium.map(
                (
                  entry
                ) => (
                  <article
                    key={`${entry.rank}-${entry.displayName}`}
                    className={`v2l-podium-card rank-${entry.rank} ${
                      entry.isCurrentUser
                        ? "is-current"
                        : ""
                    }`}
                  >

                    <div className="v2l-podium-top">

                      <span className="v2l-rank-badge">

                        {getRankIcon(
                          entry.rank
                        )}

                        #{entry.rank}

                      </span>


                      {entry.isCurrentUser && (
                        <span className="v2l-you">
                          You
                        </span>
                      )}

                    </div>


                    <div className="v2l-avatar">

                      {getInitials(
                        entry.displayName
                      )}

                    </div>


                    <div className="v2l-podium-user">

                      <strong>
                        {entry.displayName}
                      </strong>

                      <span>
                        Weekly rank #{entry.rank}
                      </span>

                    </div>


                    <div className="v2l-podium-score">

                      <span>
                        <Zap
                          size={15}
                        />

                        Weekly XP
                      </span>

                      <strong>
                        {entry.score}
                      </strong>

                    </div>


                    <div className="v2l-podium-meta">

                      <div>

                        <span>
                          Focus
                        </span>

                        <strong>
                          {formatMinutes(
                            entry.focusMinutes
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Tasks
                        </span>

                        <strong>
                          {entry.completedTasks}
                        </strong>

                      </div>

                    </div>

                  </article>
                )
              )}

            </section>


            {/* =============================================
                RANK 4+
                ============================================= */}

            {remaining.length >
              0 && (
              <section className="v2l-ranking">

                <div className="v2l-ranking-header">

                  <div>

                    <span className="v2l-eyebrow">
                      Rankings
                    </span>

                    <h3>
                      Rest of the board
                    </h3>

                  </div>


                  <span>
                    {remaining.length}
                    {" "}
                    more
                  </span>

                </div>


                <div className="v2l-table">

                  <div className="v2l-table-head">

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
                        className={`v2l-row ${
                          entry.isCurrentUser
                            ? "is-current"
                            : ""
                        }`}
                      >

                        <div className="v2l-row-rank">

                          <strong>
                            #{entry.rank}
                          </strong>

                        </div>


                        <div className="v2l-row-user">

                          <div className="v2l-mini-avatar">

                            {getInitials(
                              entry.displayName
                            )}

                          </div>


                          <div>

                            <strong>
                              {entry.displayName}
                            </strong>

                            {entry.isCurrentUser && (
                              <span>
                                You
                              </span>
                            )}

                          </div>

                        </div>


                        <div className="v2l-row-cell">

                          <Clock3
                            size={14}
                          />

                          <span>
                            {formatMinutes(
                              entry.focusMinutes
                            )}
                          </span>

                        </div>


                        <div className="v2l-row-cell">

                          <Sparkles
                            size={14}
                          />

                          <span>
                            {entry.completedTasks}
                          </span>

                        </div>


                        <div className="v2l-row-score">

                          <Zap
                            size={14}
                          />

                          <strong>
                            {entry.score} XP
                          </strong>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </section>
            )}

          </>
        )}

      </section>


      {/* ===================================================
          FAIR PLAY
          =================================================== */}

      <section className="v2l-fairplay">

        <span className="v2l-fairplay-icon">

          <ShieldCheck
            size={19}
          />

        </span>


        <div>

          <span className="v2l-eyebrow">
            Ranking rules
          </span>

          <h2>
            Fair-play scoring
          </h2>

          <p>
            StudyOS calculates leaderboard scores
            on the server and applies limits to
            Focus and task XP used in weekly
            rankings.
          </p>

        </div>

      </section>

    </div>
  );
}


// =========================================================
// STATUS CARD
// =========================================================

function StatusCard({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <article className="v2l-status-card">

      <span className="v2l-status-icon">
        {icon}
      </span>


      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>

      </div>

    </article>
  );
}


export default Leaderboard;