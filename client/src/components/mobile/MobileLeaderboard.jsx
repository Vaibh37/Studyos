import {
  useEffect,
  useState,
} from "react";

import {
  Clock3,
  Crown,
  Medal,
  RefreshCw,
  UserRound,
  Zap,
} from "lucide-react";


const PAGE_SIZE = 24;


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
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

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


const RankIcon = ({
  rank,
}) => {
  if (
    rank === 1
  ) {
    return (
      <Crown
        size={11}
      />
    );
  }

  if (
    rank === 2 ||
    rank === 3
  ) {
    return (
      <Medal
        size={11}
      />
    );
  }

  return null;
};


// =========================================================
// MOBILE LEADERBOARD
// =========================================================

function MobileLeaderboard({
  leaderboard = [],
  profile,
  currentUserRank,
  currentUserEntry,
  loading,
  refreshing,
  onRefresh,
}) {
  const [
    visibleCount,
    setVisibleCount,
  ] = useState(
    PAGE_SIZE
  );


  useEffect(
    () => {
      setVisibleCount(
        PAGE_SIZE
      );
    },
    [
      leaderboard.length,
    ]
  );


  const visibleStudents =
    leaderboard.slice(
      0,
      visibleCount
    );


  const hasMore =
    visibleCount <
    leaderboard.length;


  return (
    <section className="mobile-rank">

      {/* ===============================================
          YOUR STATUS
      =============================================== */}

      <div className="mobile-rank-status">

        <div>

          <span>
            Your rank
          </span>

          <strong>
            {profile?.isPublic
              ? currentUserRank
                ? `#${currentUserRank}`
                : "—"
              : "Private"}
          </strong>

        </div>


        <div>

          <span>
            Weekly XP
          </span>

          <strong>
            {currentUserEntry
              ? currentUserEntry.score
              : "—"}
          </strong>

        </div>


        <div>

          <span>
            Focus
          </span>

          <strong>
            {currentUserEntry
              ? formatMinutes(
                  currentUserEntry
                    .focusMinutes
                )
              : "—"}
          </strong>

        </div>

      </div>


      {/* ===============================================
          HEADING
      =============================================== */}

      <div className="mobile-rank-heading">

        <div>

          <h2>
            Top students
          </h2>

          <span>
            Last 7 days
          </span>

        </div>


        <div className="mobile-rank-heading-actions">

          <span className="mobile-rank-count">

            <UserRound
              size={12}
            />

            {leaderboard.length}

          </span>


          <button
            type="button"
            className="mobile-rank-refresh"
            onClick={
              onRefresh
            }
            disabled={
              refreshing
            }
            aria-label="Refresh leaderboard"
          >

            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "v2l-spin"
                  : ""
              }
            />

          </button>

        </div>

      </div>


      {/* ===============================================
          CONTENT
      =============================================== */}

      {loading ? (

        <div className="mobile-rank-state">

          <RefreshCw
            size={20}
            className="v2l-spin"
          />

          <strong>
            Loading rankings
          </strong>

          <span>
            Calculating weekly scores.
          </span>

        </div>

      ) : leaderboard.length ===
        0 ? (

        <div className="mobile-rank-state">

          <Crown
            size={22}
          />

          <strong>
            No ranked students
          </strong>

          <span>
            Public students with recent activity
            will appear here.
          </span>

        </div>

      ) : (

        <>

          {/* =============================================
              GRID
          ============================================= */}

          <div className="mobile-rank-grid">

            {visibleStudents.map(
              (
                entry
              ) => (
                <article
                  key={`${entry.rank}-${entry.displayName}`}
                  className={[
                    "mobile-rank-student",

                    `rank-${entry.rank}`,

                    entry.isCurrentUser
                      ? "is-current"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                >

                  {/* RANK */}

                  <div className="mobile-rank-position">

                    <span>

                      <RankIcon
                        rank={
                          entry.rank
                        }
                      />

                      #{entry.rank}

                    </span>

                    {entry.isCurrentUser && (
                      <span className="mobile-rank-you">
                        YOU
                      </span>
                    )}

                  </div>


                  {/* AVATAR */}

                  <div className="mobile-rank-avatar">

                    {getInitials(
                      entry.displayName
                    )}

                  </div>


                  {/* NAME */}

                  <strong
                    className="mobile-rank-name"
                    title={
                      entry.displayName
                    }
                  >
                    {entry.displayName}
                  </strong>


                  {/* FOCUS */}

                  <div className="mobile-rank-focus">

                    <Clock3
                      size={9}
                    />

                    <span>
                      {formatMinutes(
                        entry.focusMinutes
                      )}
                    </span>

                  </div>


                  {/* XP */}

                  <div className="mobile-rank-xp">

                    <Zap
                      size={9}
                    />

                    <strong>
                      {entry.score}
                    </strong>

                    <span>
                      XP
                    </span>

                  </div>

                </article>
              )
            )}

          </div>


          {/* =============================================
              LOAD MORE
          ============================================= */}

          {hasMore && (

            <button
              type="button"
              className="mobile-rank-load-more"
              onClick={() =>
                setVisibleCount(
                  (
                    current
                  ) =>
                    current +
                    PAGE_SIZE
                )
              }
            >
              Load 24 more

              <span>
                {Math.max(
                  0,
                  leaderboard.length -
                    visibleCount
                )}{" "}
                remaining
              </span>
            </button>

          )}

        </>

      )}

    </section>
  );
}


export default MobileLeaderboard;