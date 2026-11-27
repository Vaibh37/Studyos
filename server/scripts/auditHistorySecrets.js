// Scan unique blobs reachable from all locally fetched branches/tags. Report
// only the rule, path and object ID — never matching text or secret values.
const { execFileSync, spawnSync } = require('node:child_process');
const decoder = new TextDecoder('utf-8', { fatal: true });
const trackedSecretFiles = /(?:^|\/)(?:\.env(?:\.[^/]+)?|firebase-service-account\.json|service-account\.json|id_rsa|id_ed25519|[^/]+\.(?:pem|p12|pfx))$/i;
const safeExample = /(?:^|\/)\.env\.(?:example|sample|template)$/i;
const patterns = [
  ['private key block', /-{5}BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-{5}/],
  ['GitHub token', /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Stripe live secret', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[0-9]{8,}-[0-9]{8,}-[A-Za-z0-9-]{15,}\b/],
  ['MongoDB inline credentials', /mongodb(?:\+srv)?:\/\/(?!<|username:|user:)[^"'<>\/\s:]+:[^"'<>\/\s@]+@/i],
  ['credential literal', /\b(?:R2_SECRET_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|FIREBASE_PRIVATE_KEY|TURNSTILE_SECRET_KEY|OPENAI_API_KEY|RENDER_API_KEY)\s*["']?\s*[:=]\s*["']?[A-Za-z0-9_+\/-]{30,}(?=["'\s,;]|$)/],
];
function safePath(path) { return JSON.stringify(path); }
function main() {
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], {encoding:'utf8'}).trim() !== 'false') {
    throw new Error('Fetch full Git history before running the audit');
  }
  const objects = execFileSync('git', ['rev-list', '--objects', '--all'], {encoding:'utf8', maxBuffer:32*1024*1024})
    .trim().split('\n').filter(Boolean).map(line => {
      const space = line.indexOf(' ');
      return space < 0 ? [line, '(no path)'] : [line.slice(0,space),line.slice(space+1)];
    });
  const paths = new Map(objects);
  const batch = spawnSync('git', ['cat-file', '--batch'], {
    input: objects.map(([id]) => id).join('\n')+'\n', maxBuffer: 256*1024*1024,
  });
  if (batch.status !== 0 || batch.error) throw new Error('Unable to read all Git objects');
  let offset=0, scanned=0, skippedBinary=0, findings=0;
  const output=batch.stdout;
  while(offset<output.length) {
    const eol=output.indexOf(10,offset);
    if(eol<0) throw new Error('Invalid git object header');
    const [id,type,sizeText]=output.subarray(offset,eol).toString().split(' ');
    const size=Number(sizeText);
    if(!Number.isSafeInteger(size)||size<0) throw new Error('Invalid git object size');
    const data=output.subarray(eol+1,eol+1+size);
    offset=eol+size+2;
    if(type!=='blob' && type!=='commit' && type!=='tag') continue;
    let source;
    try { source=decoder.decode(data); if(source.includes('\x00')) throw new Error('binary'); }
    catch { skippedBinary++; continue; }
    scanned++;
    for(const [name,pattern] of patterns) {
      if(pattern.test(source)) {
        findings++;
        console.error(`${name}: ${safePath(paths.get(id)||'(no path)')} [${id.slice(0,12)}]`);
      }
    }
  }
  const names = execFileSync('git', ['log','--all','--format=','--name-only','-z'], {encoding:'utf8',maxBuffer:32*1024*1024})
    .split('\0').map(s=>s.replace(/^\n+/, '')).filter(Boolean);
  for(const path of new Set(names)) {
    if(trackedSecretFiles.test(path) && !safeExample.test(path)) {
      findings++;
      console.error(`Historical credential filename: ${safePath(path)}`);
    }
  }
  const commits=execFileSync('git',['rev-list','--all','--count'],{encoding:'utf8'}).trim();
  console.log(`History audit: ${commits} commits, ${scanned} UTF-8 objects checked, ${skippedBinary} binary objects skipped, ${findings} findings.`);
  if(findings) process.exitCode=1;
}
main();
