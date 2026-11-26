// Private hide-for-me decisions and unsent attachment cleanup metadata are
// server-side state. Never include them in chat HTTP or realtime responses.
function publicGroupMessage(message) {
  const value = typeof message?.toObject === "function" ? message.toObject() : message;
  const { deletedFor, ...safe } = value;
  if (safe.isUnsent) {
    safe.message = null;
    safe.attachments = [];
    safe.reactions = [];
    safe.replyTo = null;
  }
  return safe;
}

module.exports = { publicGroupMessage };
