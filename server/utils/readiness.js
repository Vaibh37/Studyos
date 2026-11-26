// A readiness check must not let repeated public probes fan out database
// operations or expose connection strings, provider errors, or credentials.
const PING_TIMEOUT_MS = 4000;

async function pingMongo(connection) {
  if (connection.readyState !== 1 || !connection.db) return false;
  const result = await connection.db.command({ ping: 1 }, { timeoutMS: PING_TIMEOUT_MS });
  return result?.ok === 1;
}

function boundedCheck(check, timeoutMs) {
  let timer;
  return Promise.race([
    Promise.resolve().then(check).then(value => value === true, () => false),
    new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}

function createReadinessProbe({
  checkMain, checkSocial, checkAuthConfiguration, clock = Date.now,
  timeoutMs = 5000, healthyTtlMs = 15_000, failedTtlMs = 5000,
}) {
  let cached = null, expiresAt = 0, flight = null;
  const readyText = value => value ? "ready" : "unavailable";
  return async function probe() {
    if (cached && clock() < expiresAt) return cached;
    if (flight) return flight;
    flight = (async () => {
      const [main, social, auth] = await Promise.all([
        boundedCheck(checkMain, timeoutMs),
        boundedCheck(checkSocial, timeoutMs),
        boundedCheck(checkAuthConfiguration, timeoutMs),
      ]);
      const ok = main && social && auth;
      cached = Object.freeze({
        status: ok ? "ok" : "unavailable",
        checks: Object.freeze({
          studyDatabase: readyText(main),
          socialDatabase: readyText(social),
          authConfiguration: readyText(auth),
        }),
      });
      expiresAt = clock() + (ok ? healthyTtlMs : failedTtlMs);
      return cached;
    })().finally(() => { flight = null; });
    return flight;
  };
}

module.exports = { pingMongo, createReadinessProbe };
