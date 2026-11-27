// Explicit response contract: database-only fields and future schema additions
// cannot leak to another group member through HTTP or realtime responses.
function pick(value, fields) {
  const result = {};
  for (const key of fields) if (value && Object.hasOwn(value, key)) result[key] = value[key];
  return result;
}
const MESSAGE_FIELDS = ["_id", "groupId", "userId", "displayName", "picture", "message",
  "editedAt", "isUnsent", "unsentAt", "createdAt", "updatedAt"];
const ATTACHMENT_FIELDS = ["storageKey", "fileName", "mimeType", "size", "uploadedBy", "uploadedAt"];
const REACTION_FIELDS = ["emoji", "userId", "displayName", "picture", "reactedAt"];
const array = value => Array.isArray(value) ? value : [];
const REPLY_FIELDS = ["messageId", "userId", "displayName", "message", "attachmentCount", "firstAttachmentName"];
function publicGroupMessage(message) {
  const value = typeof message?.toObject === "function" ? message.toObject() : message;
  const safe = pick(value, MESSAGE_FIELDS);
  safe.message = safe.isUnsent ? null : safe.message ?? null;
  safe.attachments = safe.isUnsent ? [] : array(value?.attachments).map(item => pick(item, ATTACHMENT_FIELDS));
  safe.reactions = safe.isUnsent ? [] : array(value?.reactions).map(item => pick(item, REACTION_FIELDS));
  safe.replyTo = !safe.isUnsent && value?.replyTo ? pick(value.replyTo, REPLY_FIELDS) : null;
  return safe;
}
module.exports = { publicGroupMessage };
