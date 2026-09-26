// Brand separation. For each brand, records what a visitor and the accounts would see: page text,
// tracking IDs, and form destinations for both environments. A change to one brand must not move
// another brand's fingerprint. The committed expectations live in tests/golden (owner-reviewed).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, brands, loadBrand } from './lib.mjs';
import { trackingPlan } from '../packages/tracking/src/plan.mjs';
import { resolveDestination } from '../packages/forms/src/destinations.mjs';

function pagesText(slug) {
  const dir = path.join(ROOT, 'apps', slug, 'dist-production', 'client');
  const out = {};
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8');
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      out[path.relative(dir, p)] = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
    }
  });
  walk(dir);
  return out;
}

export function fingerprint(slug) {
  const b = loadBrand(slug);
  const forms = {};
  for (const key of Object.keys(b.config.forms)) {
    forms[key] = { production: resolveDestination(b.config, key, 'production'), preview: resolveDestination(b.config, key, 'preview') };
  }
  return {
    tracking: { production: trackingPlan(b.config, 'production'), preview: trackingPlan(b.config, 'preview') },
    forms,
    pages: pagesText(slug),
  };
}

// Usage:
//   --write                 update tests/golden (tracking and forms only; owner-reviewed)
//   --verify                tracking and forms of every brand must match tests/golden
//   --save <file>           save the full fingerprint (pages included) of this build
//   --compare <file>        compare page text with a saved build of the base branch; only brands
//                           listed in BP_CHANGED_BRANDS may change
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const changed = (process.env.BP_CHANGED_BRANDS || '').split(',').filter(Boolean);
const all = Object.fromEntries(brands().map((s) => [s, fingerprint(s)]));
let failed = false;

if (args.includes('--write')) {
  for (const [slug, f] of Object.entries(all)) {
    fs.writeFileSync(path.join(ROOT, 'tests/golden', `${slug}.json`), JSON.stringify({ tracking: f.tracking, forms: f.forms }, null, 2) + '\n');
    console.log(`wrote tests/golden/${slug}.json`);
  }
}
if (args.includes('--verify')) {
  for (const [slug, f] of Object.entries(all)) {
    const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden', `${slug}.json`), 'utf8'));
    for (const k of ['tracking', 'forms']) {
      if (JSON.stringify(golden[k]) !== JSON.stringify(f[k])) {
        failed = true;
        console.error(`Separation: the ${k} setup of ${slug} no longer matches what your developer approved (tests/golden/${slug}.json).`);
      }
    }
    if (!failed) console.log(`Separation: ${slug} tracking and form destinations match the approved setup.`);
  }
}
if (arg('--save')) {
  fs.writeFileSync(arg('--save'), JSON.stringify(all, null, 2));
  console.log(`saved fingerprint to ${arg('--save')}`);
}
if (arg('--compare')) {
  const base = JSON.parse(fs.readFileSync(arg('--compare'), 'utf8'));
  for (const [slug, f] of Object.entries(all)) {
    const moved = ['tracking', 'forms', 'pages'].filter((k) => JSON.stringify(base[slug]?.[k]) !== JSON.stringify(f[k]));
    if (!moved.length) { console.log(`Separation: ${slug} is identical to the live version (pages, tracking, forms).`); continue; }
    if (changed.includes(slug) && moved.every((k) => k === 'pages')) { console.log(`Separation: ${slug} pages changed as edited; tracking and forms unchanged.`); continue; }
    if (changed.includes(slug)) continue; // tracking/forms moves on the edited brand are caught by --verify
    failed = true;
    console.error(`Separation: this change was meant for ${changed.join(', ') || 'shared code'}, but ${slug} ${moved.join(' and ')} changed too.`);
  }
}
if (failed) process.exit(1);
