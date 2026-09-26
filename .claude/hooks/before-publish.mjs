#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash). Early feedback only: GitHub's protected branch is the real gate.
// Exit 2 blocks the command and shows stderr to Claude. Every failure of the check itself
// (command missing, crash, timeout) also exits 2: the hook fails closed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const FORBIDDEN = [
  [/\bgit\s+push\b[^\n]*\b(main|master)\b/, 'Publishing goes through a pull request. Pushing to main directly is not allowed.'],
  [/--no-verify\b/, 'Skipping checks is not allowed.'],
  [/\bgh\s+pr\s+merge\b[^\n]*--admin\b/, 'Merging around the required checks is not allowed.'],
  [/(^|[;&|(]\s*|\bnpx\s+(--yes\s+)?|\bpnpm\s+dlx\s+|\bnpm\s+exec\s+)vercel(@\S+)?(\s|$)/, 'Deployments are done by the publishing workflow, not from this session.'],
  [/\bgit\s+push\b[^\n]*(--force|-f\b)/, 'Force-pushing is not allowed.'],
];
const GATED = /\b(git\s+commit|git\s+push|gh\s+pr\s+create)\b/;

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch {}
let command = '';
try { command = JSON.parse(input).tool_input?.command ?? ''; } catch {
  process.stderr.write('The publishing guard could not read the command, so it stopped it.\n');
  process.exit(2);
}

for (const [re, why] of FORBIDDEN) {
  if (re.test(command)) { process.stderr.write(why + '\n'); process.exit(2); }
}
if (!GATED.test(command)) process.exit(0);

const check = process.env.BP_HOOK_CHECK || 'pnpm -s check:fast';
const timeout = Number(process.env.BP_HOOK_TIMEOUT_MS || 120000);
const [bin, ...args] = check.split(' ');
const r = spawnSync(bin, args, { encoding: 'utf8', timeout, cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd() });

if (r.error?.code === 'ENOENT') {
  process.stderr.write(`The checks could not start ("${bin}" was not found), so nothing was committed. Ask your developer.\n`);
  process.exit(2);
}
if (r.error?.code === 'ETIMEDOUT' || r.signal) {
  process.stderr.write(`The checks did not finish within ${Math.round(timeout / 1000)} seconds, so nothing was committed. Try again, or ask your developer.\n`);
  process.exit(2);
}
if (r.status !== 0) {
  process.stderr.write('The checks found problems, so nothing was committed yet:\n\n' + (r.stderr || '') + (r.stdout || '') + '\nFix these, then try again.\n');
  process.exit(2);
}
process.exit(0);
