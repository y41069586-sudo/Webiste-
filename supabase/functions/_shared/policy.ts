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
  return {
    sender: Object.fromEntries(SENDER_FIELDS.filter((key) => key in sender).map((key) => [key, sender[key]])),
    pricing: value.pricing ?? {},
    guarantee: value.guarantee ?? {},
    legal: value.legal ?? {},
  };
}
