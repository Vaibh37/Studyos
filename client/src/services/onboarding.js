// Tour preferences belong to the current browser and identity, never to
// another account using the same device. They are not analytics.
const prefix = "studyos_onboarding_v1:";
const states = new Set(["pending", "dismissed", "completed"]);
const memory = new Map();

export function onboardingKey(user, isGuest = false) {
  return user?.uid ? prefix + "account:" + user.uid : isGuest ? prefix + "guest" : null;
}

export function readOnboarding(storage, key) {
  if (!key) return null;
  if (memory.has(key)) return memory.get(key);
  try {
    const value = storage.getItem(key);
    if (states.has(value)) return value;
  } catch { /* Continue in-memory when storage is blocked. */ }
  return null;
}

export function writeOnboarding(storage, key, status) {
  if (!key || !states.has(status)) return;
  try {
    storage.setItem(key, status);
    memory.delete(key);
  } catch {
    memory.set(key, status);
  }
}

export function clearOnboarding(storage, key) {
  if (!key) return;
  memory.delete(key);
  try { storage.removeItem(key); } catch { /* Storage unavailable. */ }
}

// Only an explicit Guest entry or a successful new Firebase account
// creation requests the tour. Session restores and ordinary sign-ins don't.
export function requestOnboarding(storage, user, isGuest = false) {
  const key = onboardingKey(user, isGuest);
  if (key && !readOnboarding(storage, key)) {
    writeOnboarding(storage, key, "pending");
    return true;
  }
  return false;
}

export function shouldOfferOnboarding(storage, user, isGuest = false) {
  return readOnboarding(storage, onboardingKey(user, isGuest)) === "pending";
}
