// Browser side of the tracking package: consent choice, campaign attribution, lead events.
import { CONSENT_KEYS } from './plan.mjs';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};
let pageGclid = null;

export function plan() {
  return (window.__bp && window.__bp.plan) || null;
}

export function consentState() {
  try { return localStorage.getItem('bp_consent'); } catch { return null; }
}

export function setConsent(choice) {
  const value = choice === 'granted' ? 'granted' : 'denied';
  try { localStorage.setItem('bp_consent', value); } catch {}
  window.gtag('consent', 'update', Object.fromEntries(CONSENT_KEYS.map((k) => [k, value])));
  if (value === 'granted' && pageGclid) ss.set('bp_gclid', pageGclid);
}

// Policy: UTM values are kept for the visit (first seen wins). A gclid is kept across pages
// only once ad_storage is granted; before that it is used on the page where it arrived.
export function captureAttribution(url = window.location.href) {
  const params = new URL(url).searchParams;
  if (!ss.get('bp_utm')) {
    const utm = {};
    for (const k of UTM_KEYS) if (params.get(k)) utm[k] = params.get(k);
    if (Object.keys(utm).length) ss.set('bp_utm', JSON.stringify(utm));
  }
  const gclid = params.get('gclid');
  if (gclid) {
    pageGclid = gclid;
    if (consentState() === 'granted') ss.set('bp_gclid', gclid);
  }
}

export function attribution() {
  let utm = {};
  try { utm = JSON.parse(ss.get('bp_utm') || '{}'); } catch {}
  const gclid = ss.get('bp_gclid') || pageGclid || undefined;
  return { ...utm, ...(gclid ? { gclid } : {}) };
}

// One logical lead = one receipt id. A double click or a reload never fires it twice.
export function trackLead(receipt, conversionName = 'lead') {
  const p = plan();
  if (!p || !receipt?.leadId) return { fired: [] };
  const key = 'bp_lead_' + receipt.leadId;
  if (ss.get(key)) return { fired: [], duplicate: true };
  ss.set(key, '1');
  const fired = [];
  window.gtag('event', 'generate_lead', {
    send_to: p.ga4Id,
    form_key: receipt.formKey,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
  fired.push('ga4:generate_lead');
  const sendTo = p.adsSendTo?.[conversionName];
  if (p.env === 'production' && sendTo) {
    window.gtag('event', 'conversion', { send_to: sendTo, transaction_id: receipt.leadId });
    fired.push('ads:' + sendTo);
  }
  return { fired };
}
