// Observes every request the page makes to Google measurement and ads hosts. The requests are
// answered locally with 204 so no test traffic reaches Google; gtag.js itself loads for real.
const GOOGLE = /google-analytics\.com|googleadservices\.com|doubleclick\.net|google\.com\/(pagead|ccm|rmkt)|googletagmanager\.com\/(?!gtag\/js)/;

function parse(url, body) {
  const u = new URL(url);
  const base = Object.fromEntries(u.searchParams.entries());
  const lines = (body || '').split('\n').filter(Boolean);
  if (!lines.length) return [{ host: u.host, path: u.pathname, ...base }];
  return lines.map((l) => ({ host: u.host, path: u.pathname, ...base, ...Object.fromEntries(new URLSearchParams(l).entries()) }));
}

export async function watchGoogle(page) {
  const hits = [];
  const scripts = [];
  page.on('response', (r) => {
    if (r.url().startsWith('https://www.googletagmanager.com/gtag/js')) scripts.push({ url: r.url(), status: r.status() });
  });
  await page.route(GOOGLE, (route) => {
    const req = route.request();
    hits.push(...parse(req.url(), req.postData()));
    return route.fulfill({ status: 204, body: '' });
  });
  return {
    hits,
    scripts,
    ga4(tid) { return hits.filter((h) => h.host.endsWith('google-analytics.com') && h.path.endsWith('/collect') && (!tid || h.tid === tid)); },
    ga4Events(tid, en) { return this.ga4(tid).filter((h) => h.en === en); },
    // Any request tied to a Google Ads account (config pings, remarketing, conversions).
    ads() { return hits.filter((h) => /googleadservices|doubleclick|google\.com$/.test(h.host) || (h.tid || '').startsWith('AW-')); },
    // Logical conversions: one request to the conversion endpoint per conversion event.
    conversions(id, label) {
      const num = id.replace('AW-', '');
      return hits.filter((h) => h.host === 'www.googleadservices.com' && h.path === `/pagead/conversion/${num}/` && h.en === 'conversion' && (!label || h.label === label));
    },
  };
}
