// Everything a pull request must pass, in order, with a plain summary. Used locally and in CI.
import { execSync } from 'node:child_process';
import { brands } from './lib.mjs';

const steps = [['Pages', 'node scripts/check-pages.mjs'], ['Unit tests', 'node --test tests/unit/*.test.mjs']];
for (const b of brands()) for (const env of ['preview', 'production']) steps.push([`Build ${b} (${env})`, `node scripts/build-brand.mjs ${b} ${env}`]);
steps.push(['Links', 'node scripts/check-links.mjs'], ['Brand separation', 'node scripts/fingerprint.mjs --verify'], ['Tracking and forms in a real browser', 'npx playwright test']);
for (const [name, cmd] of steps) {
  process.stdout.write(`\n== ${name}\n`);
  try { execSync(cmd, { stdio: 'inherit' }); } catch { console.error(`\nStopped at "${name}". Nothing else was checked.`); process.exit(1); }
}
console.log('\nAll checks passed.');
