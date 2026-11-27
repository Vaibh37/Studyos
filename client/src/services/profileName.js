// The legacy studyos_name key is not trustworthy: it did not identify the
// owner. Do not read or migrate it into an arbitrary signed-in account.
export function profileNameKey(user, isGuest = false) {
  if (typeof user?.uid === "string" && user.uid) return "studyos_name:account:" + user.uid;
  return isGuest ? "studyos_name:guest" : null;
}

export function readProfileName(storage, user, isGuest = false) {
  const key = profileNameKey(user, isGuest);
  if (!key) return "";
  try {
    const stored = storage.getItem(key);
    // An explicitly empty custom name is valid, not a fallback request.
    if (stored !== null) return stored;
  } catch { /* Browser storage may be disabled. */ }
  return user?.displayName?.trim() || "";
}

export function writeProfileName(storage, user, isGuest, name) {
  const key = profileNameKey(user, isGuest);
  if (!key) return;
  storage.setItem(key, String(name ?? "").trim().slice(0, 50));
}

export function clearProfileName(storage, user, isGuest = false) {
  const key = profileNameKey(user, isGuest);
  if (key) storage.removeItem(key);
}
