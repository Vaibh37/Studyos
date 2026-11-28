// Opens a real, editable GitHub issue draft in the browser. No email client
// is needed and nothing is submitted until the visitor confirms on GitHub.
export const FEATURE_REQUEST_URL = "https://github.com/Vaibh37/Studyos/issues/new?" + new URLSearchParams({
  title: "Feature request: ",
  body: "### What would you like to see?\n\n\n### What problem would it solve?\n\n\n### Additional context (optional)\n\nPlease do not include private account details or personal information.",
}).toString();
