// CI-only scan of currently tracked text files. This is a preventive check,
// not a substitute for GitHub secret scanning or a review of git history.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const files = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
}).split("\0").filter(Boolean);

const trackedSecretFiles = /(?:^|\/)(?:\.env(?:\.[^/]+)?|firebase-service-account\.json|service-account\.json|id_rsa|id_ed25519|[^/]+\.(?:pem|p12|pfx))$/i;
const safeExample = /(?:^|\/)\.env\.example$/i;
const textFile = /\.(?:js|cjs|mjs|jsx|ts|tsx|json|yaml|yml|toml|ini|md|txt|sh|ps1|config|properties)$/i;

const rules = [
  ["private key block", /-{5}BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-{5}/],
  ["GitHub personal access token", /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}/],
  ["GitHub fine-grained token", /github_pat_[A-Za-z0-9_]{40,}/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Stripe live secret", /\bsk_live_[A-Za-z0-9]{20,}\b/],
  ["Slack bot token", /\bxoxb-[0-9]{8,}-[0-9]{8,}-[A-Za-z0-9]{15,}\b/],
  // Only detect URIs with non-placeholder embedded user/password values.
  ["MongoDB inline credentials", /mongodb(?:\+srv)?:\/\/(?!<|username:|user:)[^"'<>\/\s:]+:[^"'<>\/\s@]+@/i],
];

let scanned = 0;
const findings = [];
for (const path of files) {
  if (trackedSecretFiles.test(path) && !safeExample.test(path)) {
    findings.push({ path, rule: "tracked private credential file" });
    continue;
  }
  if (!textFile.test(path)) continue;
  const stat = fs.statSync(path);
  if (stat.size > 1024 * 1024) continue;
  const source = fs.readFileSync(path, "utf8");
  scanned++;
  for (const [name, rule] of rules) {
    if (rule.test(source)) {
      findings.push({ path, rule: name });
    }
  }
}

if (findings.length) {
  console.error("Tracked secret-like material detected. Review without printing secret values:");
  for (const finding of findings) {
    console.error("  " + finding.path + " — " + finding.rule);
  }
  process.exitCode = 1;
} else {
  console.log("Tracked-file secret-pattern scan passed (" + scanned + " text files checked).");
}
