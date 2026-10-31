import { beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { leads } from '../src/db/schema';
import { resetDb } from './helpers';
import { updateConfig } from '../src/config/service';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { importProfileControl } from '../src/services/control-case';
import { addSuppression } from '../src/services/suppression';
const p = {
  sourceUrl: 'https://www.kleinanzeigen.de/s-anzeige/fixture/1234567890-239-1',
  businessName: 'Fiktiver Renovierungsbetrieb',
  branch: 'maler',
  street: 'Beispielweg',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Fiktivstadt',
  phone: '03012345678',
};
beforeEach(async () => {
  await resetDb();
  await updateConfig({ targeting: { branches: DEFAULT_CONFIG.targeting.branches } }, 'test');
});
it('imports one traceable profile without pretending it is OSM, qualified or contacted', async () => {
  const id = await importProfileControl(p, 'test');
  const row = await getDb().query.leads.findFirst({ where: eq(leads.id, id) });
  expect(row).toMatchObject({
    source: 'public_profile',
    sourceId: p.sourceUrl,
    status: 'discovered',
    lettersSent: 0,
    contactedAt: null,
  });
  expect(await importProfileControl(p, 'test')).toBe(id);
  expect(await getDb().select().from(leads)).toHaveLength(1);
});
it('does not reintroduce a suppressed business or accept an unreviewed source', async () => {
  await addSuppression(getDb(), { name: p.businessName, ...p }, 'fixture');
  await expect(importProfileControl(p, 'test')).rejects.toThrow('Sperrlisteneintrag');
  await expect(importProfileControl({ ...p, sourceUrl: 'https://maps.google.com/business/x' }, 'test')).rejects.toThrow(
    'Quellenprüfung',
  );
  expect(await getDb().select().from(leads)).toHaveLength(0);
});
it('blocks a phone duplicate across cities and postcodes instead of silently researching the wrong address', async () => {
  const id = await importProfileControl(p, 'test');
  await expect(
    importProfileControl(
      {
        ...p,
        sourceUrl: p.sourceUrl.replace('1234567890', '1234567891'),
        phone: '+49 30 12345678',
        city: 'Andere Stadt',
        postalCode: '23456',
      },
      'test',
    ),
  ).rejects.toThrow('Mögliche Dublette');
  expect(await getDb().select().from(leads)).toHaveLength(1);
  expect((await getDb().query.leads.findFirst({ where: eq(leads.id, id) }))?.city).toBe(p.city);
});
