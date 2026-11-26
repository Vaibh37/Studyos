// A short-lived, in-memory cache for private study lists only. A scope is the
// actual Firebase User instance, never a token string or a global user ID.
export function createStudyReadCache({ ttl = 20_000, now = Date.now } = {}) {
  const values = new Map();
  const flights = new Map();
  let scope = null;
  let epoch = 0;
  let scopeEpoch = 0;
  let writes = 0;

  const copy = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  function invalidate() {
    epoch++;
    values.clear();
    flights.clear();
  }

  function setScope(next) {
    if (scope === next) return;
    scope = next;
    scopeEpoch++;
    writes = 0;
    invalidate();
  }

  async function read(user, path, load, { fresh = false } = {}) {
    setScope(user);
    if (!user) return load();
    const cached = values.get(path);
    if (!fresh && !writes && cached && cached.expires > now()) return copy(cached.value);
    if (cached) values.delete(path);

    // Requests that started before a mutation must not refill the cache.
    if (writes) return load();
    const existing = flights.get(path);
    if (existing) return copy(await existing);

    const startEpoch = epoch;
    const flight = Promise.resolve().then(load).then(value => {
      if (scope === user && epoch === startEpoch && !writes && Array.isArray(value)) {
        values.set(path, { value: copy(value), expires: now() + ttl });
      }
      return value;
    }).finally(() => {
      if (flights.get(path) === flight) flights.delete(path);
    });
    flights.set(path, flight);
    return copy(await flight);
  }

  function beginWrite(user) {
    setScope(user);
    const startScope = scopeEpoch;
    writes++;
    invalidate();
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      if (startScope !== scopeEpoch) return;
      writes = Math.max(0, writes - 1);
      invalidate();
    };
  }

  return { read, setScope, invalidate, beginWrite };
}
