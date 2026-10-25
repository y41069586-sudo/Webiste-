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
  assert.ok(texts.termsMarkdown.includes('Steuerstatus ist ungeklärt'));
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
