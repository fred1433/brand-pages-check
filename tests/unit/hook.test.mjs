import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from '../../scripts/lib.mjs';

const HOOK = path.join(ROOT, '.claude/hooks/before-publish.mjs');
function run(command, env = {}, raw) {
  const r = spawnSync('node', [HOOK], {
    input: raw ?? JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: r.status, err: r.stderr };
}

test('witness: a commit passes when the checks pass', () => {
  assert.equal(run('git commit -m "x"', { BP_HOOK_CHECK: 'true' }).code, 0);
});
test('witness: unrelated commands are not gated', () => {
  assert.equal(run('ls -la', { BP_HOOK_CHECK: 'false' }).code, 0);
});
test('failing checks block the commit with exit 2', () => {
  const r = run('git commit -m "x"', { BP_HOOK_CHECK: 'false' });
  assert.equal(r.code, 2);
  assert.match(r.err, /nothing was committed/);
});
test('a missing check command blocks (fails closed)', () => {
  const r = run('gh pr create --fill', { BP_HOOK_CHECK: 'no-such-binary-bp' });
  assert.equal(r.code, 2);
  assert.match(r.err, /could not start/);
});
test('a check that hangs is stopped and blocks', () => {
  const r = run('git push -u origin edit/x', { BP_HOOK_CHECK: 'sleep 5', BP_HOOK_TIMEOUT_MS: '500' });
  assert.equal(r.code, 2);
  assert.match(r.err, /did not finish/);
});
test('unreadable hook input blocks', () => {
  assert.equal(run('', {}, 'not json').code, 2);
});
test('pushing to main, skipping checks, admin merge and direct deploys are refused', () => {
  for (const c of ['git push origin main', 'git commit --no-verify -m x', 'gh pr merge 3 --admin --squash', 'npx vercel --prod', 'git push --force origin edit/x']) {
    assert.equal(run(c, { BP_HOOK_CHECK: 'true' }).code, 2, c);
  }
});
