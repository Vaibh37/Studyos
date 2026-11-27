// URLs from saved Markdown, pasted HTML and toolbar input must obey the same
// policy. Bare domains can still be autolinked using the configured HTTPS default.
export function isSafeNoteLink(value) {
  if (typeof value !== "string" || !value || /[\x00-\x20\x7f-\x9f]/.test(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname); }
    catch { return false; }
  }
  // Allow existing relative anchor links and bare hostnames, but reject
  // protocol-relative URLs and obfuscated scheme separators.
  return !value.startsWith("//") && !value.includes("\\") && !value.includes(":");
}
