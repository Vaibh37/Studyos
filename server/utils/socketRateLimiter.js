// Bounded sliding-window budgets. Expired identities must not accumulate for
// the lifetime of the process, and floods of distinct keys cannot grow forever.
function createSocketRateLimiter(limits = [], { clock = Date.now, maxKeys = 50_000 } = {}) {
  const attemptsByUser = new Map();
  const largestWindow = Math.max(...limits.map(limit => limit.windowMs), 0);
  let nextSweep = 0;

  return key => {
    const now = clock();
    if (now >= nextSweep) {
      for (const [id, attempts] of attemptsByUser) {
        if (now - attempts.at(-1) >= largestWindow) attemptsByUser.delete(id);
      }
      nextSweep = now + largestWindow;
    }
    const previous = attemptsByUser.get(key);
    const recent = (previous || []).filter(timestamp => now - timestamp < largestWindow);
    for (const limit of limits) {
      const attempts = recent.filter(timestamp => now - timestamp < limit.windowMs);
      if (attempts.length >= limit.max) {
        attemptsByUser.set(key, recent);
        return { allowed: false, retryAfterMs: Math.max(1, limit.windowMs - (now - attempts[0])) };
      }
    }
    // Fail closed for untracked identities at capacity rather than evicting
    // active keys (which would allow attackers to reset an existing budget).
    if (!previous && attemptsByUser.size >= maxKeys) {
      return { allowed: false, retryAfterMs: Math.max(1, nextSweep - now) };
    }
    recent.push(now);
    attemptsByUser.set(key, recent);
    return { allowed: true, retryAfterMs: 0 };
  };
}
module.exports = { createSocketRateLimiter };
