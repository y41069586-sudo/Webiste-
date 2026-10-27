import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
const OPERATOR_PROFILE = {
  name: 'Erika Beispiel',
  company: 'Beispielwerk',
  street: 'Beispielweg 1',
  postalCode: '12345',
  city: 'Beispielstadt',
  email: 'support@example.test',
  phone: '+493000000000',
  whatsappNumber: '493000000000',
  website: 'example.test',
  intro: 'Fiktiver Betrieb. Nur für Tests.',
  photoUrl: '',
};
import { legalDrafts } from '../apps/web/src/lib/legal-drafts';

test('founding project identifies the natural person without inventing registrations', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, {
    sender: OPERATOR_PROFILE,
    tax: { operatorConfirmed: true, kleinunternehmer: true },
    offers: { activeVersion: 'v4' },
  });
  const text = legalDrafts(cfg);
  for (const key of ['impressumMarkdown', 'privacyMarkdown', 'termsMarkdown'] as const) {
    assert.ok(text[key].includes(OPERATOR_PROFILE.name));
    assert.ok(text[key].includes(OPERATOR_PROFILE.street));
    assert.ok(text[key].includes(OPERATOR_PROFILE.email));
  }
  assert.ok(!/Gründungsphase|Gewerbeanmeldung|Handelsregistereintrag|juristische Person/.test(text.impressumMarkdown));
  assert.ok(!text.impressumMarkdown.includes('(Einzelunternehmen)'));
  assert.ok(!/Registergericht|HRB|HRA|e\.K\./.test(text.impressumMarkdown));
  assert.ok(text.termsMarkdown.includes('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet'));
  assert.ok(!text.termsMarkdown.includes('Steuerstatus ist ungeklärt'));
  assert.equal(cfg.legal.termsMarkdown, '');
});

test('legal working texts use confirmed contact details and do not disclose tax/account secrets', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, {
    sender: { ...OPERATOR_PROFILE, taxNumber: 'private-tax-number', bankIban: 'private-bank-account' },
  });
  const texts = legalDrafts(cfg);
  assert.ok(texts.impressumMarkdown.includes('Erika Beispiel'));
  assert.ok(texts.impressumMarkdown.includes('12345 Beispielstadt'));
  assert.ok(texts.impressumMarkdown.includes('support@example.test'));
  assert.ok(!JSON.stringify(texts).includes('private-tax-number'));
  assert.ok(!JSON.stringify(texts).includes('private-bank-account'));
  // Ungeklärter Steuerstatus: wahrheitsgemäßer öffentlicher Hinweis, keine § 19-Behauptung, kein interner Vermerk
  assert.ok(texts.termsMarkdown.includes('umsatzsteuerliche Behandlung wird vor Annahme der ersten Bestellung festgelegt'));
  assert.ok(texts.termsMarkdown.includes('Steuerbefreiung nach § 19 UStG wird nicht zugesichert'));
  assert.ok(!texts.impressumMarkdown.includes('Umsatzsteuer-Identifikationsnummer'));
  assert.ok(texts.privacyMarkdown.includes('keine ausschließlich automatisierten Entscheidungen'));
  assert.equal(cfg.legal.termsMarkdown, '');
  assert.equal(cfg.switches.dryRun, true);
});

test('contract prices come from existing configuration', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, {
    sender: OPERATOR_PROFILE,
    offers: { activeVersion: 'legacy' },
    pricing: { packageCents: 75000, monthlyCents: 5500 },
  });
  const text = legalDrafts(cfg).termsMarkdown;
  assert.ok(text.includes('750'));
  assert.ok(text.includes('55'));
  assert.ok(!text.includes('590 Euro'));
});

test('V4 legal drafts explain providers, truthful test status and unresolved mandatory details', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, { sender: OPERATOR_PROFILE });
  const text = legalDrafts(cfg);
  for (const provider of ['Netlify', 'Supabase', 'Stripe', 'Resend', 'easyNova', 'Anthropic'])
    assert.ok(text.privacyMarkdown.includes(provider), provider);
  assert.ok(!text.privacyMarkdown.includes('LetterXpress'), 'Briefdienst ist easyNova (Betreiberentscheidung 27.10.2026)');
  assert.ok(text.privacyMarkdown.includes('Art. 14'));
  assert.ok(text.privacyMarkdown.includes('jederzeit ohne Begründung'));
  assert.ok(text.termsMarkdown.includes('60 Minuten'));
  assert.ok(text.termsMarkdown.includes('Monatsabrechnung beginnt erst'));
  // Vollständige Betreiberdaten: keine internen Arbeitsvermerke in öffentlichen Texten (Exportsperre)
  for (const key of ['impressumMarkdown', 'privacyMarkdown', 'termsMarkdown'] as const)
    assert.ok(!text[key].includes('TODO'), key);
  assert.ok(text.termsMarkdown.includes('Der Vertrag kommt mit unserer Bestellbestätigung per E-Mail zustande'));
  assert.ok(!/49\s*€|590\s*€/.test(text.termsMarkdown));
  const incomplete = legalDrafts(deepMerge(cfg, { sender: { name: '', street: '' } }));
  assert.ok(incomplete.impressumMarkdown.includes('TODO: vollständiger Vor- und Nachname'));
  assert.ok(incomplete.privacyMarkdown.includes('TODO: Straße und Hausnummer'));
  assert.equal(cfg.legal.termsMarkdown, '');
});
