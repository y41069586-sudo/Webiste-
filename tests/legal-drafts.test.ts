import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { OPERATOR_PROFILE } from '../packages/core/src/config/operator';
import { legalDrafts } from '../apps/web/src/lib/legal-drafts';

test('legal working texts use confirmed contact details and do not disclose tax/account secrets', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, {
    sender: { ...OPERATOR_PROFILE, taxNumber: 'private-tax-number', bankIban: 'private-bank-account' },
  });
  const texts = legalDrafts(cfg);
  assert.ok(texts.impressumMarkdown.includes('Doaa Attia'));
  assert.ok(texts.impressumMarkdown.includes('94081 Fürstenzell'));
  assert.ok(texts.impressumMarkdown.includes('support@seitenwerk.world'));
  assert.ok(!JSON.stringify(texts).includes('private-tax-number'));
  assert.ok(!JSON.stringify(texts).includes('private-bank-account'));
  assert.ok(texts.termsMarkdown.includes('Umsatzsteuerstatus der Anbieterin ist noch zu klären'));
  assert.ok(texts.privacyMarkdown.includes('keine ausschließlich automatisierten Entscheidungen'));
  assert.equal(cfg.legal.termsMarkdown, '');
  assert.equal(cfg.switches.dryRun, true);
});

test('contract prices come from existing configuration', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, { sender: OPERATOR_PROFILE, pricing: { packageCents: 75000, monthlyCents: 5500 } });
  const text = legalDrafts(cfg).termsMarkdown;
  assert.ok(text.includes('750'));
  assert.ok(text.includes('55'));
  assert.ok(!text.includes('590 Euro'));
});
