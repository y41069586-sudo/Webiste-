import { expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { publicOperatorSettings } from '../src/config/operator';
import { senderContactLine } from '../src/letters/compose';
import { demoOptions, whatsappUrl } from '../src/demos/offer-options';

const cfg = (phone: string, whatsappNumber: string) =>
  deepMerge(DEFAULT_CONFIG, {
    sender: {
      name: 'Max Beispiel',
      phone,
      whatsappNumber,
      email: 'support@seitenwerk.test',
      intro: 'Ich gestalte Websites für lokale Betriebe.',
    },
  });

// Betreiber (06.11.2026): Kunden erreichen ihn nur per E-Mail – keine Telefon- oder WhatsApp-Nummer nach außen
it('Brief nennt nur die E-Mail, auch wenn Telefon und WhatsApp hinterlegt sind', () => {
  const line = senderContactLine(cfg('+49 1521 9682134', '4915219682134'), { withIntro: false });
  expect(line).toBe('Fragen beantworte ich gern per E-Mail an support@seitenwerk.test.');
  expect(line).not.toMatch(/\d{4}|WhatsApp|Telefon/);
});

it('öffentliche Betreiberdaten und Demo enthalten weder Telefon noch WhatsApp', () => {
  const c = cfg('0231 000000', '4915219682134');
  const pub = publicOperatorSettings(c, DEFAULT_CONFIG.sender);
  expect(pub.sender.phone).toBe('');
  expect(pub.sender.whatsappNumber).toBe('');
  expect(whatsappUrl(c, 'abc')).toBeNull();
  const d = demoOptions('abc', c);
  expect(d.whatsappUrl).toBeNull();
  expect(d.sender.phone).toBe('');
  expect(d.trust?.phone).toBe('');
});
