import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicConfig } from '../supabase/functions/_shared/policy';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
const OPERATOR_PROFILE = { name:'Erika Beispiel',company:'Beispielwerk',street:'Beispielweg 1',postalCode:'12345',city:'Beispielstadt',email:'support@example.test',phone:'+493000000000',whatsappNumber:'493000000000',website:'example.test',intro:'Fiktiver Betrieb. Nur für Tests.',photoUrl:'' };
import { goLiveBlockers } from '../packages/core/src/services/readiness';

test('public config never discloses banking, tax IDs, internal switches or unknown settings', () => {
  const result = publicConfig({
    sender: { ...OPERATOR_PROFILE, bankIban: 'private', taxNumber: 'private', photoUrl: 'old-photo' },
    switches: { dryRun: true },
    privateKey: 'private',
    pricing: { packageCents: 59000 },
  });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('private'));
  assert.ok(!text.includes('photoUrl'));
  assert.ok(!('switches' in result));
  assert.equal(result.sender.email, 'support@example.test');
});

test('no personal photo is required while missing legal and fiscal information still blocks live operations', () => {
  const config = deepMerge(DEFAULT_CONFIG, { sender: OPERATOR_PROFILE });
  const keys = goLiveBlockers(config).map((b) => b.key);
  assert.ok(!keys.includes('sender.photoUrl'));
  assert.ok(keys.includes('sender.taxNumber'));
  assert.ok(keys.includes('legal.termsMarkdown'));
  assert.ok(keys.includes('legal.privacyMarkdown'));
  assert.equal(config.switches.dryRun, true);
});
