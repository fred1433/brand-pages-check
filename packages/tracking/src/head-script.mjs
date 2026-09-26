import { CONSENT_KEYS } from './plan.mjs';

// Inline script placed first in <head>. Order matters: the consent defaults are set before
// any measurement command and before gtag.js or GTM is requested.
export function headScript(plan) {
  const denied = Object.fromEntries(CONSENT_KEYS.map((k) => [k, 'denied']));
  const granted = Object.fromEntries(CONSENT_KEYS.map((k) => [k, 'granted']));
  const lines = [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;',
    `gtag('consent','default',${JSON.stringify({ ...denied, wait_for_update: 500 })});`,
    `try{var c=localStorage.getItem('bp_consent');if(c==='granted'){gtag('consent','update',${JSON.stringify(granted)});}}catch(e){}`,
    `window.__bp=${JSON.stringify({ plan })};`,
  ];
  if (plan.gtmId) {
    lines.push(
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(plan.gtmId)});`
    );
  }
  if (plan.ga4Id || plan.adsId) {
    lines.push("gtag('js',new Date());");
    if (plan.ga4Id) lines.push(`gtag('config',${JSON.stringify(plan.ga4Id)});`);
    if (plan.adsId) lines.push(`gtag('config',${JSON.stringify(plan.adsId)});`);
  }
  return lines.join('\n');
}

export function gtagSrc(plan) {
  const id = plan.ga4Id || plan.adsId;
  return id ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}` : null;
}
