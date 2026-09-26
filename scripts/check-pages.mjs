// Checks every page of every brand before anything is built, and explains problems in plain English.
import { brands, loadBrand, loadPages } from './lib.mjs';

const asJson = process.argv.includes('--json');
const only = process.argv.find((a) => a.startsWith('--brand='))?.split('=')[1];
const all = brands().map(loadBrand);
const problems = [];
let pageCount = 0;

function problem(brand, file, message) {
  problems.push({ brand: brand.config.name, file: `apps/${brand.slug}/content/pages/${file}`, message });
}

for (const brand of all.filter((b) => !only || b.slug === only)) {
  const others = all.filter((b) => b.slug !== brand.slug);
  for (const page of loadPages(brand)) {
    pageCount++;
    const f = page.file;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug)) problem(brand, f, `The file name "${f}" becomes the page address. Use lowercase words joined by hyphens, like "request-a-demo.yaml".`);
    if (!page.data) {
      problem(brand, f, `This file could not be read: ${page.doc.errors[0].message.split('\n')[0]}`);
      continue;
    }
    const p = page.data;
    if (!p.title) problem(brand, f, 'The page needs a "title" (shown in the browser tab and in Google).');
    if (!p.description) problem(brand, f, 'The page needs a "description" (the sentence Google shows under the title).');
    if (!Array.isArray(p.sections) || p.sections.length === 0) {
      problem(brand, f, 'The page has no sections.');
      continue;
    }
    const anchors = new Set(p.sections.map((s) => s?.id).filter(Boolean));
    const seenIds = new Set();
    p.sections.forEach((s, i) => {
      const where = `Section ${i + 1} ("${s?.type}")`;
      const spec = brand.catalog.sections[s?.type];
      if (!spec) {
        const owner = others.find((o) => o.catalog.sections[s?.type]);
        problem(brand, f, owner
          ? `${where} belongs to ${owner.config.name}, not ${brand.config.name}. Each brand only uses its own sections. Available here: ${Object.keys(brand.catalog.sections).join(', ')}.`
          : `${where} does not exist in the ${brand.config.name} library. Available: ${Object.keys(brand.catalog.sections).join(', ')}.`);
        return;
      }
      for (const key of Object.keys(s)) {
        if (key !== 'type' && !spec.fields[key]) problem(brand, f, `${where} has a field "${key}" that this section does not use. Its fields are: ${Object.keys(spec.fields).join(', ')}.`);
      }
      for (const [key, rule] of Object.entries(spec.fields)) {
        const v = s[key];
        if (v === undefined || v === null || v === '') {
          if (rule.required) {
            if (rule.type === 'formKey') {
              problem(brand, f, `${where} is a form but does not say where its entries go. Add "form:" with one of: ${Object.keys(brand.config.forms).join(', ')}.`);
            } else problem(brand, f, `${where} needs "${key}".`);
          }
          continue;
        }
        if (rule.type === 'text' && rule.max && String(v).length > rule.max) problem(brand, f, `${where}: "${key}" is ${String(v).length} characters; keep it under ${rule.max} so it fits the design.`);
        if (rule.type === 'asset' && !brand.assets[v]) problem(brand, f, `${where}: there is no image called "${v}". Images available: ${Object.keys(brand.assets).join(', ')}.`);
        if (rule.type === 'assets') {
          const list = Array.isArray(v) ? v : [];
          list.filter((a) => !brand.assets[a]).forEach((a) => problem(brand, f, `${where}: there is no image called "${a}".`));
          if (rule.min && list.length < rule.min) problem(brand, f, `${where}: needs at least ${rule.min} images.`);
          if (rule.max && list.length > rule.max) problem(brand, f, `${where}: takes at most ${rule.max} images.`);
        }
        if (rule.type === 'quoteIds') {
          (Array.isArray(v) ? v : []).filter((q) => !brand.catalog.quotes[q]).forEach((q) => problem(brand, f, `${where}: there is no quote called "${q}". Quotes available: ${Object.keys(brand.catalog.quotes).join(', ')}.`));
        }
        if (rule.type === 'formKey' && !brand.config.forms[v]) {
          problem(brand, f, `${where} sends its entries to "${v}", which is not set up for ${brand.config.name}. Set up forms: ${Object.keys(brand.config.forms).join(', ')}. Use one of those, or ask your developer to add "${v}" (the destination lists are reviewed by them).`);
        }
        if (rule.type === 'items' || rule.type === 'list') {
          const list = Array.isArray(v) ? v : [];
          if (rule.min && list.length < rule.min) problem(brand, f, `${where}: needs at least ${rule.min} entries.`);
          if (rule.max && list.length > rule.max) problem(brand, f, `${where}: takes at most ${rule.max} entries.`);
          if (rule.itemFields) list.forEach((it, j) => rule.itemFields.forEach((k) => { if (!it?.[k]) problem(brand, f, `${where}, entry ${j + 1}, needs "${k}".`); }));
        }
        if (rule.type === 'link') {
          if (!v.label || !v.target) problem(brand, f, `${where}: the button needs a "label" and a "target".`);
          else if (v.target.startsWith('#') && !anchors.has(v.target.slice(1))) problem(brand, f, `${where}: the button points to "${v.target}", but no section on this page has id "${v.target.slice(1)}".`);
        }
        if (rule.type === 'anchor') {
          if (seenIds.has(v)) problem(brand, f, `${where}: the id "${v}" is used twice on this page.`);
          seenIds.add(v);
        }
      }
    });
  }
}

if (asJson) {
  console.log(JSON.stringify({ pages: pageCount, problems }, null, 2));
} else if (problems.length) {
  console.error(`Page check: ${problems.length} problem(s) found in ${pageCount} page(s). Nothing can be published until they are fixed.\n`);
  for (const p of problems) console.error(`- ${p.file}\n  ${p.message}\n`);
} else {
  console.log(`Page check: ${pageCount} page(s), no problems.`);
}
process.exit(problems.length ? 1 : 0);
