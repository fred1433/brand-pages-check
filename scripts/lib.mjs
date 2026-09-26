import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export function brands() {
  return fs.readdirSync(path.join(ROOT, 'apps')).filter((d) => fs.existsSync(path.join(ROOT, 'apps', d, 'content/pages')));
}

export function loadBrand(slug) {
  return {
    slug,
    config: readJson(`brands/${slug}/brand.config.json`),
    catalog: readJson(`brands/${slug}/catalog.json`),
    assets: readJson(`brands/${slug}/assets.json`),
    pagesDir: path.join(ROOT, 'apps', slug, 'content/pages'),
  };
}

export function loadPages(brand) {
  return fs
    .readdirSync(brand.pagesDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(brand.pagesDir, file), 'utf8');
      const doc = YAML.parseDocument(raw, { prettyErrors: true });
      return { file, slug: file.replace(/\.yaml$/, ''), raw, doc, data: doc.errors.length ? null : doc.toJS() };
    });
}
