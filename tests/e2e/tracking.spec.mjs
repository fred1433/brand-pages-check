import { test, expect } from '@playwright/test';
import { targets, formPages, allPages, loadBrand } from './targets.mjs';
import { watchGoogle } from './google.mjs';

async function submitFirstForm(page, form, { twice = false } = {}) {
  const f = page.locator(`form[data-form-key="${form}"]`).first();
  await f.locator('input[name="firstName"]').fill('Test');
  await f.locator('input[name="email"]').fill('test@example.com');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/lead') && r.request().method() === 'POST');
  const button = f.locator('button[type="submit"]');
  if (twice) await button.dblclick(); else await button.click();
  const receipt = await (await response).json();
  await expect(f).toHaveAttribute('data-state', 'sent');
  return receipt;
}

for (const t of targets()) {
  const brand = loadBrand(t.brand).config;
  const prod = t.env === 'production';
  const ga4 = brand.tracking.ga4[t.env];
  const ads = brand.tracking.ads;

  test.describe(`${brand.name} / ${t.env}`, () => {
    for (const path of allPages(t.brand)) {
      test(`page ${path} loads, tags load, consent defaults come first`, async ({ page }) => {
        const g = await watchGoogle(page);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const res = await page.goto(t.baseURL + path);
        expect(res.status()).toBe(200);
        await expect(page.locator('meta[name="bp-deploy-env"]')).toHaveAttribute('content', t.env);
        // Positive control: gtag.js loaded and GA4 page_view reached the destination for this environment.
        await expect.poll(() => g.ga4Events(ga4, 'page_view').length, { timeout: 15000 }).toBe(1);
        expect(g.scripts.every((s) => s.status === 200)).toBe(true);
        const other = brand.tracking.ga4[prod ? 'preview' : 'production'];
        expect(g.ga4(other)).toHaveLength(0);
        // Consent: the first dataLayer command is the default, all four signals denied.
        const first = await page.evaluate(() => Array.from(window.dataLayer[0]));
        expect(first[0]).toBe('consent');
        expect(first[1]).toBe('default');
        for (const k of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) expect(first[2][k]).toBe('denied');
        expect(g.ga4Events(ga4, 'page_view')[0].gcs).toBe('G100');
        expect(errors).toEqual([]);
      });
    }

    for (const { path, forms } of formPages(t.brand)) {
      const form = forms[0];
      const dest = brand.forms[form].destination[t.env];

      test(`${path}: accept all, submit "${form}" -> ${prod ? 'one Ads conversion' : 'no Ads request at all'}`, async ({ page }) => {
        const g = await watchGoogle(page);
        await page.goto(t.baseURL + path);
        await expect.poll(() => g.ga4Events(ga4, 'page_view').length, { timeout: 15000 }).toBe(1);
        await page.locator('[data-consent="granted"]').click();
        const receipt = await submitFirstForm(page, form);
        expect(receipt.destination).toBe(dest);
        expect(receipt.environment).toBe(t.env);
        await expect.poll(() => g.ga4Events(ga4, 'generate_lead').length, { timeout: 15000 }).toBe(1);
        expect(g.ga4Events(ga4, 'generate_lead')[0].gcs).toBe('G111');
        if (prod) {
          await expect.poll(() => g.conversions(ads.conversionId, ads.labels.lead).length, { timeout: 15000 }).toBe(1);
        } else {
          await page.waitForTimeout(2500);
          expect(g.ads()).toEqual([]);
        }
      });

      test(`${path}: double click and reload count one lead`, async ({ page }) => {
        const g = await watchGoogle(page);
        await page.goto(t.baseURL + path);
        await page.locator('[data-consent="granted"]').click();
        let posts = 0;
        page.on('request', (r) => { if (r.url().endsWith('/api/lead') && r.method() === 'POST') posts++; });
        await submitFirstForm(page, form, { twice: true });
        await expect.poll(() => g.ga4Events(ga4, 'generate_lead').length, { timeout: 15000 }).toBe(1);
        await page.reload();
        await expect.poll(() => g.ga4Events(ga4, 'page_view').length, { timeout: 15000 }).toBe(2);
        await page.waitForTimeout(2000);
        expect(posts).toBe(1);
        expect(g.ga4Events(ga4, 'generate_lead')).toHaveLength(1);
        if (prod) expect(g.conversions(ads.conversionId)).toHaveLength(1);
      });

      test(`${path}: reject all keeps signals denied and the gclid on its landing page only`, async ({ page }) => {
        const g = await watchGoogle(page);
        await page.goto(`${t.baseURL}${path}?utm_source=test&utm_campaign=reject&gclid=GCLID_REJECT`);
        await page.locator('[data-consent="denied"]').click();
        await page.goto(t.baseURL + path);
        let body;
        page.on('request', (r) => { if (r.url().endsWith('/api/lead')) body = r.postDataJSON(); });
        await submitFirstForm(page, form);
        expect(body.attribution).toEqual({ utm_source: 'test', utm_campaign: 'reject' });
        await expect.poll(() => g.ga4Events(ga4, 'generate_lead').length, { timeout: 15000 }).toBe(1);
        expect(g.ga4Events(ga4, 'generate_lead')[0].gcs).toBe('G100');
        const stored = await page.evaluate(() => localStorage.getItem('bp_consent'));
        expect(stored).toBe('denied');
      });

      test(`${path}: UTM and gclid survive navigation once consent is granted`, async ({ page }) => {
        await watchGoogle(page);
        await page.goto(`${t.baseURL}${path}?utm_source=newsletter&utm_medium=email&gclid=GCLID_OK`);
        await page.locator('[data-consent="granted"]').click();
        await page.goto(t.baseURL + path);
        let body;
        page.on('request', (r) => { if (r.url().endsWith('/api/lead')) body = r.postDataJSON(); });
        const receipt = await submitFirstForm(page, form);
        expect(body.attribution).toEqual({ utm_source: 'newsletter', utm_medium: 'email', gclid: 'GCLID_OK' });
        expect(receipt.request.body.contact?.fieldValues ?? receipt.request.body.fields).toBeTruthy();
      });
    }

    test('the browser cannot choose the list', async ({ request }) => {
      const form = Object.keys(brand.forms)[0];
      const res = await request.post(`${t.baseURL}/api/lead`, {
        data: { formKey: form, email: 'x@example.com', firstName: 'X', list: 'Customers (live)', destination: 'live' },
      });
      const r = await res.json();
      expect(r.destination).toBe(brand.forms[form].destination[t.env]);
      expect(r.ignoredClientFields).toEqual(['list', 'destination']);
      const bad = await request.post(`${t.baseURL}/api/lead`, { data: { formKey: 'not-a-form', email: 'x@example.com' } });
      expect(bad.status()).toBe(422);
    });
  });
}
