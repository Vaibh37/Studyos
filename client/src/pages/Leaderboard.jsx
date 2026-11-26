import { WorkspaceSkeleton, WorkspaceEmpty, SkeletonBlock } from "../components/WorkspaceStates";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Crown,
  ChevronDown,
  EyeOff,
  LockKeyhole,
  Medal,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
} from "../components/icons";

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


  const pageSize = 24;

  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [leaderboard.length]);

  // GUEST MODE

  if (isGuest) {
    return (
      <div className="v2l-page slb-page">

        <header className="slb-header">
          <h1>Leaderboard</h1>
        </header>

        <section className="slb-empty">

          <LockKeyhole size={28} aria-hidden="true" />

          <h2>Sign in to join the leaderboard</h2>

          <p>
            Personal XP, levels and streaks still work
            in Guest mode. A StudyOS account is required
            to appear in public rankings.
          </p>

          <p>
            Guest activity stays outside the public leaderboard.
          </p>

        </section>

      </div>
    );
  }

  const visibleEntries = leaderboard.slice(0, visibleCount);

  return (
    <div className="v2l-page slb-page">

      {/* HEADER */}

      <header className="slb-header">

        <div>
          <h1>Leaderboard</h1>
          <p>Weekly standings · Last 7 days</p>
        </div>

        <button
          type="button"
          className="slb-refresh"
          onClick={() => loadLeaderboard(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "slb-spin" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </header>


      {/* ERROR */}

      {error && (
        <div className="slb-notice is-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}


      {/* PRIVATE PROFILE */}

      {!loading && !error && !profile.isPublic && (
        <div className="slb-notice">

          <EyeOff size={18} />

          <div>

            <strong>
              Your leaderboard profile is private
            </strong>

            <p>
              To appear in the public ranking,
              go to Settings → Leaderboard.
            </p>

          </div>

        </div>
      )}


      {/* PERSONAL STATISTICS */}

      <section
        className="slb-stats"
        aria-label="Your weekly statistics"
      >

        <div className="slb-stat">

          <span>Your rank</span>

          <strong>
            {loading
              ? <SkeletonBlock width={55} height={23} />
              : !profile.isPublic
                ? "Private"
                : currentUserRank
                  ? `#${currentUserRank}`
                  : "Unranked"}
          </strong>

        </div>

        <div className="slb-stat">

          <span>Weekly score</span>

          <strong>
            {loading ? <SkeletonBlock width={55} height={23} /> : currentUserEntry
              ? `${currentUserEntry.score} XP`
              : "—"}
          </strong>

        </div>

        <div className="slb-stat">

          <span>Focus</span>

          <strong>
            {loading ? <SkeletonBlock width={55} height={23} /> : currentUserEntry
              ? formatMinutes(currentUserEntry.focusMinutes)
              : "—"}
          </strong>

        </div>

      </section>


      {/* GLOBAL LEADERBOARD */}

      <section
        className="slb-board"
        aria-labelledby="slb-heading"
        aria-busy={loading || refreshing}
      >

        <div className="slb-board-heading">

          <h2 id="slb-heading">
            Global ranking
          </h2>

          <span>

            <UserRound size={15} />

            {loading ? "—" : leaderboard.length}{" "}

            {leaderboard.length === 1
              ? "student"
              : "students"}

          </span>

        </div>


        {loading ? (
          <WorkspaceSkeleton label="rankings" count={6} avatar />
        ) : leaderboard.length === 0 ? (

          <WorkspaceEmpty icon={<Trophy size={24} />}
            title={error ? "Rankings unavailable" : "No ranked students yet"}
            description={!error ? "Public StudyOS users with recent activity will appear here." : undefined}
          />
        ) : (

          <>

            <table
              className="slb-table"
              aria-labelledby="slb-heading"
            >

              <colgroup>
                <col className="slb-col-rank" />
                <col />
                <col className="slb-col-focus" />
                <col className="slb-col-tasks" />
                <col className="slb-col-score" />
              </colgroup>

              <thead>

                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Student</th>
                  <th scope="col">Focus</th>
                  <th scope="col">Tasks</th>
                  <th scope="col">XP</th>
                </tr>

              </thead>

              <tbody>

                {visibleEntries.map((entry, index) => (

                  <tr
                    key={`${entry.rank}-${entry.displayName}-${index}`}
                    className={`slb-row${
                      entry.isCurrentUser
                        ? " is-current"
                        : ""
                    }`}
                  >

                    {/* RANK */}

                    <td>

                      <span
                        className={`slb-rank rank-${entry.rank}`}
                      >

                        <span
                          className="slb-medal"
                          aria-hidden="true"
                        >
                          {getRankIcon(entry.rank)}
                        </span>

                        #{entry.rank}

                      </span>

                    </td>


                    {/* STUDENT */}

                    <th scope="row">

                      <div className="slb-person">

                        <span
                          className="slb-avatar"
                          aria-hidden="true"
                        >
                          {getInitials(entry.displayName)}
                        </span>

                        <div className="slb-name">

                          <span>
                            {entry.displayName || "StudyOS Student"}
                          </span>

                          {entry.isCurrentUser && (
                            <small>You</small>
                          )}

                        </div>

                      </div>

                    </th>


                    {/* FOCUS */}

                    <td>
                      {formatMinutes(entry.focusMinutes)}
                    </td>


                    {/* TASKS */}

                    <td>
                      {entry.completedTasks}
                    </td>


                    {/* SCORE */}

                    <td className="slb-score">
                      {entry.score}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>


            {visibleEntries.length < leaderboard.length && (

              <button
                type="button"
                className="slb-more"
                onClick={() =>
                  setVisibleCount(count => count + pageSize)
                }
              >

                Load more ·{" "}

                {leaderboard.length - visibleEntries.length}
                {" "}remaining

              </button>

            )}

          </>

        )}

      </section>


      {/* COLLAPSIBLE RANKING RULES */}

      <details className="slb-rules">

        <summary>

          <ShieldCheck size={17} />

          <span>Fair-play scoring</span>

          <ChevronDown
            size={16}
            className="slb-chevron"
          />

        </summary>

        <p>
          Weekly score combines eligible StudyOS Focus
          and completed task activity. Scores are calculated
          on the server with limits on Focus and task XP.
        </p>

      </details>

    </div>
  );
}

export default Leaderboard;