import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { goLiveBlockers, letterBlockers } from '../src/services/readiness';

const complete = {
  sender: {
    name: 'Erika Beispiel',
    company: 'Beispielwerk',
    street: 'Beispielweg 1',
    postalCode: '12345',
    city: 'Beispielstadt',
    email: 'support@beispielwerk.test',
    phone: '+493000000000',
    whatsappNumber: '493000000000',
    website: 'beispielwerk.test',
    intro: 'Fiktiver Betrieb. Nur für Tests.',
  },
  legal: { impressumMarkdown: '# Impressum', privacyMarkdown: '# Datenschutz' },
};

describe('Freigaben: Briefe getrennt vom Verkauf', () => {
  it('ohne Steuernummer, IBAN, Steuerbestätigung und AGB sind Briefe frei, der Verkauf bleibt gesperrt', () => {
    const cfg = deepMerge(DEFAULT_CONFIG, complete);
    expect(letterBlockers(cfg)).toEqual([]);
    expect(
      goLiveBlockers(cfg)
        .map((b) => b.key)
        .sort(),
    ).toEqual(['legal.termsMarkdown', 'sender.bankIban', 'tax.operatorConfirmed'].sort());
  });
  it('fehlende Absenderangaben oder Datenschutzerklärung sperren weiterhin echte Briefe', () => {
    const cfg = deepMerge(DEFAULT_CONFIG, { ...complete, legal: { impressumMarkdown: '# Impressum', privacyMarkdown: '' } });
    expect(letterBlockers(cfg).map((b) => b.key)).toEqual(['legal.privacyMarkdown']);
    expect(letterBlockers(DEFAULT_CONFIG).some((b) => b.key === 'sender.name')).toBe(true);
  });
});
