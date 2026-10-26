/** Optional private environment inputs; the stored settings remain authoritative. */
export const OPERATOR_PROFILE = {
  company: process.env.OPERATOR_COMPANY ?? 'SeitenWerk',
  photoUrl: '',
  name: process.env.OPERATOR_NAME ?? '',
  street: process.env.OPERATOR_STREET ?? '',
  postalCode: process.env.OPERATOR_POSTAL_CODE ?? '',
  city: process.env.OPERATOR_CITY ?? '',
  email: process.env.OPERATOR_EMAIL ?? '',
  phone: process.env.OPERATOR_PHONE ?? '',
  whatsappNumber: process.env.OPERATOR_WHATSAPP ?? '',
  website: process.env.OPERATOR_WEBSITE ?? '',
  intro: process.env.OPERATOR_INTRO ?? '',
};

/** Public pages never present the internal starter identity as a real provider. */
export function publicOperatorSettings<T extends { sender: Record<string, unknown> }>(
  cfg: T,
  defaults: T['sender'],
  profile: Record<string, unknown> = OPERATOR_PROFILE,
): T {
  const sender = { ...cfg.sender };
  const unconfigured = !sender.name || sender.name === defaults.name;
  for (const key of ['name', 'company', 'street', 'email', 'phone', 'website', 'whatsappNumber', 'intro']) {
    if (!sender[key] || sender[key] === defaults[key]) sender[key] = profile[key] ?? '';
  }
  if (unconfigured) for (const key of ['postalCode', 'city']) sender[key] = profile[key] ?? '';
  return { ...cfg, sender };
}
