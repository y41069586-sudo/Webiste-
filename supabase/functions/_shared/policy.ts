export const SENDER_FIELDS = [
  'name',
  'company',
  'street',
  'postalCode',
  'city',
  'email',
  'phone',
  'website',
  'whatsappNumber',
  'intro',
] as const;

export function publicConfig(value: Record<string, unknown>) {
  const sender = (value.sender ?? {}) as Record<string, unknown>;
  const offers = (value.offers ?? {}) as Record<string, unknown>;
  return {
    sender: Object.fromEntries(SENDER_FIELDS.filter((key) => key in sender).map((key) => [key, sender[key]])),
    pricing: value.pricing ?? {},
    // Preserve the explicitly configured offer version across the static/dynamic boundary.
    // Internal billing settings and future unknown fields are never exposed here.
    offers: offers.activeVersion === 'v4' || offers.activeVersion === 'legacy' ? { activeVersion: offers.activeVersion } : {},
    guarantee: value.guarantee ?? {},
    legal: value.legal ?? {},
  };
}
