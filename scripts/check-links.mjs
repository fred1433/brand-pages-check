// Reads every built page and checks that each internal link and anchor points somewhere real.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, brands } from './lib.mjs';

const problems = [];
let checked = 0;
for (const brand of brands().filter((b) => !process.env.BP_ONLY || b === process.env.BP_ONLY)) {
  const dir = path.join(ROOT, 'apps', brand, 'dist-preview', 'client');
  if (!fs.existsSync(dir)) { problems.push(`${brand}: no build found in ${dir}. Run the build first.`); continue; }
  const pages = new Map();
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      let route = '/' + path.relative(dir, p).replace(/index\.html$/, '').replace(/\.html$/, '');
      route = route.replace(/\/$/, '') || '/';
      pages.set(route, fs.readFileSync(p, 'utf8'));
    }
  });
  walk(dir);
  for (const [route, html] of pages) {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
      checked++;
      const [p, hash] = url.split('#');
      const target = p === '' ? route : (p.replace(/\/$/, '') || '/');
      const exists = pages.has(target) || fs.existsSync(path.join(dir, p));
      if (!exists) problems.push(`${brand} ${route}: the link "${url}" leads to a page that does not exist.`);
      else if (hash && pages.has(target)) {
        const tIds = target === route ? ids : new Set([...pages.get(target).matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
        if (!tIds.has(hash)) problems.push(`${brand} ${route}: the link "${url}" points to a section that is not on that page.`);
      }
    }
  }
}
if (problems.length) {
  console.error(`Link check: ${problems.length} broken link(s).\n` + problems.map((p) => '- ' + p).join('\n'));
  process.exit(1);
}
console.log(`Link check: ${checked} internal links and images, none broken.`);
