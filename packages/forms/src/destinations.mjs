// The form destination is decided here, on the server, from the brand config and the
// deployment environment. Nothing the browser sends can choose a list.

export class FormConfigError extends Error {}

export function deploymentEnv(vercelEnv) {
  return vercelEnv === 'production' ? 'production' : 'preview';
}

export function resolveDestination(brand, formKey, vercelEnv) {
  const form = brand.forms?.[formKey];
  if (!form) {
    const known = Object.keys(brand.forms ?? {}).join(', ') || 'none';
    throw new FormConfigError(`${brand.name} has no form called "${formKey}". Configured forms: ${known}.`);
  }
  const env = deploymentEnv(vercelEnv);
  return {
    formKey,
    provider: form.provider,
    list: form.destination[env],
    environment: env,
    conversion: form.conversion ?? null,
  };
}
