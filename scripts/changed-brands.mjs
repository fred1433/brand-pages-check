// Reads changed file paths on stdin and prints the brands they affect. Shared code affects all brands.
import fs from 'node:fs';
import { brands } from './lib.mjs';
const files = fs.readFileSync(0, 'utf8').split('\n').filter(Boolean);
const all = brands();
const set = new Set();
for (const f of files) {
  const m = f.match(/^(apps|brands)\/([^/]+)\//);
  if (m && all.includes(m[2])) set.add(m[2]);
  else if (/^(packages|scripts)\/|^package\.json$|^pnpm-lock\.yaml$/.test(f)) all.forEach((b) => set.add(b));
}
process.stdout.write([...set].join(','));
