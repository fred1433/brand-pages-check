// Writes the routes, forms and brand settings of one brand as built from THIS checkout, so a
// deployed preview is tested against its own pages rather than those of main.
// usage: node scripts/route-manifest.mjs <brand> <out.json>
import fs from 'node:fs';
import { loadBrand, loadPages } from './lib.mjs';
const [slug, out] = process.argv.slice(2);
const b = loadBrand(slug);
const pages = loadPages(b).map((p) => ({
  path: p.slug === 'index' ? '/' : `/${p.slug}`,
  forms: (p.data?.sections ?? []).filter((s) => s.form).map((s) => s.form),
}));
fs.writeFileSync(out, JSON.stringify({ brand: slug, config: b.config, pages }, null, 2));
console.log(`route manifest: ${pages.length} page(s) -> ${out}`);
