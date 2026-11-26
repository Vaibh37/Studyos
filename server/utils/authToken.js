// Bound untrusted token inputs before passing them to Firebase Admin.
// Keep verification (including revocation) in the Firebase SDK.
function validAuthToken(token) {
  return typeof token === "string" && token.length > 0 && token.length <= 8192 && /\S/.test(token);
}
module.exports = { validAuthToken };
