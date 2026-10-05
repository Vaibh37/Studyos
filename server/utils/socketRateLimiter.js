const createSocketRateLimiter =
  (
    limits = []
  ) => {
    const attemptsByUser =
      new Map();

    const largestWindow =
      Math.max(
        ...limits.map(
          (
            limit
          ) =>
            limit.windowMs
        ),
        0
      );

    return (
      userId
    ) => {
      const now =
        Date.now();

      const previous =
        attemptsByUser.get(
          userId
        ) || [];

      const recent =
        previous.filter(
          (
            timestamp
          ) =>
            now -
            timestamp <
            largestWindow
        );

      for (
        const limit of limits
      ) {
        const attemptsInWindow =
          recent.filter(
            (
              timestamp
            ) =>
              now -
              timestamp <
              limit.windowMs
          );

        if (
          attemptsInWindow.length >=
          limit.max
        ) {
          const oldestAttempt =
            attemptsInWindow[0];

          const retryAfterMs =
            Math.max(
              1,
              limit.windowMs -
              (
                now -
                oldestAttempt
              )
            );

          attemptsByUser.set(
            userId,
            recent
          );

          return {
            allowed:
              false,

            retryAfterMs,
          };
        }
      }

      recent.push(
        now
      );

      attemptsByUser.set(
        userId,
        recent
      );

      return {
        allowed:
          true,

        retryAfterMs:
          0,
      };
    };
  };

module.exports = {
  createSocketRateLimiter,
};