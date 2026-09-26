// Decides, from the brand config and the deployment environment, which tags a build may load.
// Previews and local builds never configure Google Ads, whatever the visitor's consent says.

export const CONSENT_KEYS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];

export function normalizeEnv(env) {
  return env === 'production' ? 'production' : 'preview';
}

export function trackingPlan(brand, deployEnv) {
  const env = normalizeEnv(deployEnv);
  const t = brand.tracking ?? {};
  const ga4Id = t.ga4?.[env] ?? null;
  let adsId = null;
  let adsSendTo = {};
  if (env === 'production' && t.ads?.conversionId) {
    adsId = t.ads.conversionId;
    for (const [name, label] of Object.entries(t.ads.labels ?? {})) {
      adsSendTo[name] = `${adsId}/${label}`;
    }
  }
  return {
    brand: brand.slug,
    env,
    mode: t.mode === 'basic' ? 'basic' : 'advanced',
    ga4Id,
    gtmId: t.gtm ?? null,
    adsId,
    adsSendTo,
  };
}
