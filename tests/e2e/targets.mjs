import { brands, loadBrand, loadPages } from '../../scripts/lib.mjs';

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
  const brand = loadBrand(brandSlug);
  return loadPages(brand)
    .filter((p) => p.data?.sections?.some((s) => s.form))
    .map((p) => ({ path: p.slug === 'index' ? '/' : `/${p.slug}`, forms: p.data.sections.filter((s) => s.form).map((s) => s.form) }));
}

export function allPages(brandSlug) {
  return loadPages(loadBrand(brandSlug)).map((p) => (p.slug === 'index' ? '/' : `/${p.slug}`));
}

export { loadBrand };
