import { expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { senderContactLine, whatsappMatchesPhone } from '../src/letters/compose';

const cfg = (phone: string, whatsappNumber: string) =>
  deepMerge(DEFAULT_CONFIG, {
    sender: { phone, whatsappNumber, email: 'support@seitenwerk.test', intro: 'Ich gestalte Websites für lokale Betriebe.' },
  });

it('lädt zur WhatsApp-Nachricht ein, wenn Telefon- und WhatsApp-Nummer übereinstimmen', () => {
  const c = cfg('+49 1521 9682134', '4915219682134');
  expect(whatsappMatchesPhone(c)).toBe(true);
  expect(senderContactLine(c, { withIntro: false })).toBe(
    'Fragen beantworte ich gern per WhatsApp-Nachricht an +49 1521 9682134 oder per E-Mail an support@seitenwerk.test.',
  );
  expect(whatsappMatchesPhone(cfg('01521 9682134', '4915219682134'))).toBe(true);
});
it('bleibt bei Telefon, wenn WhatsApp fehlt oder eine andere Nummer ist', () => {
  expect(senderContactLine(cfg('0231 000000', ''), { withIntro: false })).toBe(
    'Fragen beantworte ich gern: Telefon 0231 000000 oder E-Mail support@seitenwerk.test.',
  );
  expect(whatsappMatchesPhone(cfg('0231 000000', '4915219682134'))).toBe(false);
});
