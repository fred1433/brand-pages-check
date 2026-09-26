import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackingPlan } from '../../packages/tracking/src/plan.mjs';
import { headScript } from '../../packages/tracking/src/head-script.mjs';
import { resolveDestination } from '../../packages/forms/src/destinations.mjs';
import { readJson } from '../../scripts/lib.mjs';

const vp = readJson('brands/vertical-printers/brand.config.json');

test('production configures Ads with conversion id and label', () => {
  const p = trackingPlan(vp, 'production');
  assert.equal(p.adsId, 'AW-100000001');
  assert.equal(p.adsSendTo.lead, 'AW-100000001/demoLeadVP');
  assert.equal(p.ga4Id, 'G-DEMOVP0001');
});
test('preview and unknown environments never configure Ads', () => {
  for (const env of ['preview', 'development', undefined, 'staging']) {
    const p = trackingPlan(vp, env);
    assert.equal(p.adsId, null);
    assert.deepEqual(p.adsSendTo, {});
    assert.equal(p.ga4Id, 'G-TESTVP0001');
  }
});
test('consent default is written before any config or GTM command', () => {
  const s = headScript({ ...trackingPlan(vp, 'production'), gtmId: 'GTM-TEST' });
  const d = s.indexOf("gtag('consent','default'");
  assert.ok(d > 0);
  assert.ok(d < s.indexOf("gtag('config'"));
  assert.ok(d < s.indexOf('gtm.js'));
  for (const k of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) assert.match(s.slice(d, s.indexOf('\n', d)), new RegExp(`"${k}":"denied"`));
});
test('form destinations are decided by environment on the server', () => {
  assert.equal(resolveDestination(vp, 'demo-request', 'production').list, 'VP demo requests (demo list)');
  assert.equal(resolveDestination(vp, 'demo-request', 'preview').list, 'VP test list');
  assert.equal(resolveDestination(vp, 'demo-request', undefined).list, 'VP test list');
  assert.throws(() => resolveDestination(vp, 'academy-webinar', 'production'), /no form called "academy-webinar"/);
});
