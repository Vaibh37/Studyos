// Never serialize raw provider errors: their messages, stacks and metadata can
// contain passwords, tokens, query values, file names and user content.
const errorNames = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ValidationError',
  'CastError', 'MongoServerError', 'MongoNetworkError',
  'MongoServerSelectionError', 'MongooseServerSelectionError', 'AbortError',
  'TimeoutError', 'FirebaseAuthError', 'FirebaseError', 'NoSuchKey',
  'NotFound', 'AccessDenied', 'S3ServiceException',
]);
const errorCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  'auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token',
  'auth/user-disabled', 'auth/user-not-found', 'auth/argument-error',
  'auth/internal-error', 'auth/invalid-credential', 'auth/network-request-failed',
  '11000', '50', '13', '18',
]);
function safeErrorDetails(error) {
  const name = error?.name;
  const rawCode = error?.code;
  const code = typeof rawCode === "number" || typeof rawCode === "string" ? String(rawCode) : null;
  return {
    type: errorNames.has(name) ? name : 'Error',
    ...(errorCodes.has(code) ? { code } : {}),
  };
}
// Callers must supply a static, developer-authored operation label.
function logError(operation, error, write = console.error) {
  write(operation, safeErrorDetails(error));
}
module.exports = { logError, safeErrorDetails };
