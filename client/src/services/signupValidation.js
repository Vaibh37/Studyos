// Keep registration validation in the auth boundary as well as the form.
// Password spaces are significant; reject an all-whitespace password, but
// never trim a real password (existing accounts may deliberately use spaces).
export const MAX_SIGNUP_NAME_LENGTH = 50;

export function validateSignup({ name, password }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) throw new Error("Enter your name.");
  if (cleanName.length > MAX_SIGNUP_NAME_LENGTH) {
    throw new Error("Name must be at most 50 characters.");
  }
  if (typeof password !== "string" || !password.trim() || password.length < 6) {
    throw new Error("Use a password of at least 6 characters that is not only whitespace.");
  }
  return cleanName;
}
