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
