import { resolveDestination, FormConfigError } from './destinations.mjs';
import { adapters, sanitizedRequest } from './adapters.mjs';

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function handleLead({ brand, request, vercelEnv, now = Date.now(), random = Math.random }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json(400, { ok: false, error: 'The form data could not be read.' });
  }
  const email = String(input.email ?? '').trim();
  const firstName = String(input.firstName ?? '').trim().slice(0, 80);
  if (!EMAIL.test(email)) return json(422, { ok: false, error: 'Enter a valid email address.' });

  let dest;
  try {
    dest = resolveDestination(brand, String(input.formKey ?? ''), vercelEnv);
  } catch (e) {
    if (e instanceof FormConfigError) return json(422, { ok: false, error: e.message });
    throw e;
  }
  const ignored = ['list', 'destination', 'provider', 'environment'].filter((k) => k in input);
  const attribution = {};
  for (const k of ATTRIBUTION_KEYS) {
    if (input.attribution?.[k]) attribution[k] = String(input.attribution[k]).slice(0, 200);
  }
  const adapter = adapters[dest.provider];
  const built = adapter.build({ contact: { email, firstName, attribution }, list: dest.list });
  const leadId = `lead_${now.toString(36)}_${Math.floor(random() * 1e8).toString(36)}`;
  return json(200, {
    ok: true,
    leadId,
    brand: brand.slug,
    formKey: dest.formKey,
    provider: adapter.label,
    destination: dest.list,
    environment: dest.environment,
    conversion: dest.conversion,
    delivery: 'simulated: nothing was sent to any account',
    ignoredClientFields: ignored,
    request: sanitizedRequest(built),
  });
}
