import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSetting } from '../src/config/service';
import { getDb } from '../src/db/client';
import { demos, leads, supportMessages } from '../src/db/schema';
import { demoRevisionKey } from '../src/demos/revision-types';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { buildDemo, closeBrowser, qaDemo, reviseDemo } from '../src/render';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { findLeads } from '../src/services/lead-finder';
import { handleDemoQuestion } from '../src/services/tracking';
import { resetDb } from './helpers';

describe('Kostenlose Änderung vor dem Kauf', () => {
  let demoId: string;
  let slug: string;
  beforeAll(async () => {
    await resetDb();
    await findLeads({ actor: 'job:test' });
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    demoId = await buildDemo(lead.id, { actor: 'job:test' });
    await qaDemo(demoId, 'job:test', { lighthouse: false });
    await approveDemo(demoId, 'admin:test', {
      manual: true,
      review: {
        facts: true,
        desktop: true,
        mobile: true,
        images: true,
        text: true,
        qualityScores: { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 },
      },
    });
    await publishDemo(demoId, 'admin:test');
    slug = (await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) }))!.slug;
  }, 180_000);
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
  });

  it('nimmt einen Wunsch über die Demo an und kennzeichnet ihn im Support', async () => {
    const res = await handleDemoQuestion(
      slug,
      {
        name: 'Test Person',
        email: 'wunsch@example.com',
        message: 'Bitte die Farbe dunkler und Fassadenanstrich ergänzen.',
        consent: true,
        honeypot: '',
        ts: Date.now() - 60_000,
        kind: 'wish',
      },
      { ipHash: 'test-ip', userAgent: 'vitest', isBot: false } as never,
    );
    expect(res.ok).toBe(true);
    const msg = (await getDb().select().from(supportMessages))[0]!;
    expect(msg.subject).toMatch(/^Änderungswunsch vor dem Kauf:/);
    expect(msg.escalationReason).toContain('Demo anpassen');
  });

  it('passt die Demo unter demselben Link an und blockiert erfundene Fakten', async () => {
    const before = (await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) }))!;
    const ok = await reviseDemo({
      demoId,
      actor: 'admin:test',
      patch: {
        hero_headline: 'Frische Farbe für Ihr Zuhause',
        services: [
          { title: 'Innenanstrich', text: 'Wände und Decken in Wohnungen, Büros und Treppenhäusern.' },
          { title: 'Tapezierarbeiten', text: 'Vom Entfernen alter Tapeten bis zur neuen Wandgestaltung.' },
          { title: 'Fassadenanstrich', text: 'Schutz und frisches Aussehen für Ihre Außenwände.' },
        ],
        servicesConfirmedByBusiness: true,
      },
    });
    expect(ok, JSON.stringify(ok)).toMatchObject({ state: 'done' });
    expect(ok.revision).toBe(1);
    const after = (await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) }))!;
    expect(after.slug).toBe(before.slug);
    expect(after.status).toBe('published');
    const html = (await getProviders().storage.get(after.htmlStorageKey!))!.toString('utf8');
    expect(html).toContain('Frische Farbe für Ihr Zuhause');
    expect(html).toContain('Fassadenanstrich');
    expect(await getSetting(demoRevisionKey(demoId), null)).toMatchObject({ state: 'done', revision: 1 });

    const blocked = await reviseDemo({
      demoId,
      actor: 'admin:test',
      patch: { about: 'Seit 1985 Ihr Familienbetrieb mit 30 Jahren Erfahrung und Meistertitel.' },
    });
    expect(blocked.state).toBe('blocked');
    expect(blocked.violations?.length).toBeGreaterThan(0);
    const still = (await getProviders().storage.get(after.htmlStorageKey!))!.toString('utf8');
    expect(still).not.toContain('Seit 1985');
  });
  it('repairs a failed draft without reusing its old QA or publishing it', async () => {
    await getDb().update(demos).set({ status: 'qa_failed' }).where(eq(demos.id, demoId));
    const result = await reviseDemo({
      demoId,
      actor: 'test:repair',
      patch: {
        hero_subline: 'Beschreiben Sie Ihr Vorhaben für eine unverbindliche Anfrage.',
        seo_description: 'Malerarbeiten in Dortmund: Leistungen ansehen und unverbindlich anfragen.',
      },
    });
    expect(result.state).toBe('done');
    const row = await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) });
    expect(row).toMatchObject({ status: 'building', qaResultJson: null, reviewRequired: true });
    expect(row?.contentJson?.seo_description).toBe('Malerarbeiten in Dortmund: Leistungen ansehen und unverbindlich anfragen.');
  });
});
