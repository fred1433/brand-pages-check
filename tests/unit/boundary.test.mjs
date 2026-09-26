// The owners' Claude Code session may write page content and nothing else. Every tracked file
// outside apps/*/content/pages must be denied to the session AND owned by the developer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../scripts/lib.mjs';

const CONTENT = /^apps\/[^/]+\/content\/pages\//;
const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));

function globToRe(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
const rules = (tool) => settings.permissions.deny.filter((r) => r.startsWith(tool + '(')).map((r) => globToRe(r.slice(tool.length + 1, -1)));
const denyWrite = settings.sandbox.filesystem.denyWrite;

test('witness: page content stays writable for the session', () => {
  const content = files.filter((f) => CONTENT.test(f));
  assert.ok(content.length > 0);
  for (const f of content) {
    for (const tool of ['Edit', 'Write']) assert.ok(!rules(tool).some((re) => re.test(f)), `${f} should be editable`);
    assert.ok(!denyWrite.some((d) => f === d || f.startsWith(d + '/')), `${f} should be writable in the sandbox`);
  }
});

test('every file outside page content is denied to the session (permissions and sandbox)', () => {
  const missing = [];
  for (const f of files.filter((x) => !CONTENT.test(x))) {
    for (const tool of ['Edit', 'Write']) if (!rules(tool).some((re) => re.test(f))) missing.push(`${tool} ${f}`);
    if (!denyWrite.some((d) => f === d || f.startsWith(d + '/'))) missing.push(`sandbox ${f}`);
  }
  assert.deepEqual(missing, []);
});

test('CODEOWNERS: developer owns everything except page content', () => {
  const lines = fs.readFileSync(path.join(ROOT, '.github/CODEOWNERS'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  assert.deepEqual(lines.map((l) => l.split(/\s+/)), [['*', '@fred1433'], ['/apps/*/content/pages/']]);
});

test('hook: the inner check timeout always fires before Claude Code abandons the hook', () => {
  const hook = settings.hooks.PreToolUse.flatMap((h) => h.hooks).find((h) => h.command.includes('before-publish.mjs'));
  assert.ok(hook, 'hook configured');
  const src = fs.readFileSync(path.join(ROOT, '.claude/hooks/before-publish.mjs'), 'utf8');
  const inner = Number(src.match(/BP_HOOK_TIMEOUT_MS \|\| (\d+)/)[1]);
  assert.ok(hook.timeout * 1000 >= inner + 30000, `outer ${hook.timeout}s must exceed inner ${inner}ms by 30s`);
});
