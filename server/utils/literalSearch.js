// Treat a search term as a literal substring, not a MongoDB regex program.
// Keep searches bounded to reduce expensive scans across long note bodies.
const MAX_SEARCH_LENGTH = 120;

function parseLiteralSearch(value) {
  if (value === undefined || value === "") {
    return { pattern: null };
  }

  if (typeof value !== "string") {
    return { error: "Search must be text" };
  }

  const search = value.trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    return { error: "Search cannot exceed 120 characters" };
  }
  if (!search) {
    return { pattern: null };
  }

  const escaped = search.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
  return { pattern: new RegExp(escaped, "i") };
}

module.exports = { parseLiteralSearch, MAX_SEARCH_LENGTH };
