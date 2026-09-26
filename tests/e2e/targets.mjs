import fs from 'node:fs';
import { brands, loadBrand as loadBrandFromCheckout, loadPages } from '../../scripts/lib.mjs';

// A deployed preview is tested from the route manifest built with it (BP_MANIFEST), never from
// the pages of the checkout running the tests. Paths are validated before use.
const SAFE_PATH = /^\/[a-z0-9]+(-[a-z0-9]+)*$|^\/$/;
function manifest() {
  if (!process.env.BP_MANIFEST) return null;
  const m = JSON.parse(fs.readFileSync(process.env.BP_MANIFEST, 'utf8'));
  for (const p of m.pages) if (!SAFE_PATH.test(p.path)) throw new Error(`Unsafe route in manifest: ${p.path}`);
  return m;
}
export function loadBrand(slug) {
  const m = manifest();
  if (m && m.brand === slug) return { slug, config: m.config };
  return loadBrandFromCheckout(slug);
}

const PORTS = { 'vertical-printers': 4501, 'brand-b': 4511 };

export function targets() {
  if (process.env.BP_BASE_URL) {
    const brand = process.env.BP_BRAND;
    return [{ brand, env: process.env.BP_EXPECT_ENV || 'production', baseURL: process.env.BP_BASE_URL.replace(/\/$/, '') }];
  }
  const only = process.env.BP_BRANDS ? process.env.BP_BRANDS.split(',') : brands();
  const list = [];
  only.forEach((brand, i) => {
    const base = PORTS[brand] ?? 4600 + i * 10;
    for (const [j, env] of ['preview', 'production'].entries()) {
      list.push({ brand, env, port: base + j, baseURL: `http://127.0.0.1:${base + j}` });
    }
  });
  return list;
}

// Every page that carries a form is exercised, so a new page is covered without writing a test.
export function formPages(brandSlug) {
  const m = manifest();
  if (m && m.brand === brandSlug) return m.pages.filter((p) => p.forms.length);
  const brand = loadBrandFromCheckout(brandSlug);
  return loadPages(brand)
    .filter((p) => p.data?.sections?.some((s) => s.form))
    .map((p) => ({ path: p.slug === 'index' ? '/' : `/${p.slug}`, forms: p.data.sections.filter((s) => s.form).map((s) => s.form) }));
}

export function allPages(brandSlug) {
  const m = manifest();
  if (m && m.brand === brandSlug) return m.pages.map((p) => p.path);
  return loadPages(loadBrandFromCheckout(brandSlug)).map((p) => (p.slug === 'index' ? '/' : `/${p.slug}`));
}

