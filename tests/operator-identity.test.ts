import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { publicOperatorSettings } from '../packages/core/src/config/operator';
test('public pages suppress internal starter identity and preserve stored settings', () => {
  const visible = publicOperatorSettings(DEFAULT_CONFIG, DEFAULT_CONFIG.sender, { company: 'SeitenWerk' });
  assert.equal(visible.sender.company, 'SeitenWerk');
  for (const k of ['name', 'street', 'city', 'postalCode', 'email', 'phone'])
    assert.equal(visible.sender[k as keyof typeof visible.sender], '');
  assert.notEqual(DEFAULT_CONFIG.sender.name, '');
});
test('confirmed provider details are retained, including a city that matches the starter city', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, {
    sender: {
      name: 'Erika Echt',
      company: 'Echtwerk',
      street: 'Echter Weg 8',
      city: 'Dortmund',
      email: 'support@echt.test',
      phone: '+493000000001',
      website: 'echt.test',
    },
  });
  const visible = publicOperatorSettings(cfg, DEFAULT_CONFIG.sender, {});
  assert.equal(visible.sender.name, 'Erika Echt');
  assert.equal(visible.sender.city, 'Dortmund');
  assert.equal(visible.sender.email, 'support@echt.test');
});
