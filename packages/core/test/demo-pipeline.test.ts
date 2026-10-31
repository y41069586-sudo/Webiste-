import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { buildDemo, closeBrowser, qaDemo } from '../src/render';
import { findLeads } from '../src/services/lead-finder';
import { approveDemo, publishDemo, rejectDemo, requiresManualReview } from '../src/services/demo-review';
import { updateConfig } from '../src/config/service';
import { getProviders } from '../src/providers';
import { getBoss, stopBoss } from '../src/queue';
import { registerMockStructured } from '../src/providers';
import { QA_TOOL_NAME } from '../src/demos/content';
import { alerts } from '../src/db/schema';
import { resetDb } from './helpers';

describe('Demo-Pipeline (Mock-KI, echter Browser)', () => {
  let leadId: string;
  beforeAll(async () => {
    await resetDb();
    await findLeads({ actor: 'job:test' });
    const q = await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1);
    leadId = q[0]!.id;
  });
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
  });

  it('baut eine Demo, besteht die QA (inkl. axe und Lighthouse) und landet in der Review-Queue', async () => {
    const demoId = await buildDemo(leadId, { actor: 'job:test' });
    const lead = await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) });
    expect(lead?.status).toBe('demo_built');
    const result = await qaDemo(demoId, 'job:test', { lighthouse: true });
    const failed = result.checks.filter((c) => !c.passed);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(result.checks.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'inhaltsregeln',
        'ki-pruefung',
        'html-validierung',
        'konsole',
        'axe-desktop',
        'axe-mobil',
        'layout-desktop',
        'layout-mobil',
        'lighthouse',
      ]),
    );
    await expect(approveDemo(demoId, 'test:automatic', { manual: false })).rejects.toThrow(/Gestaltungskontext/);
    const demo = await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) });
    expect(demo?.status).toBe('pending_review');
    expect(demo?.slug.length).toBeGreaterThanOrEqual(20);
    const storage = getProviders().storage;
    for (const k of [demo!.htmlStorageKey!, demo!.screenshotDesktopKey!, demo!.screenshotMobileKey!, demo!.compositeKey!]) {
      expect(await storage.exists(k), k).toBe(true);
    }
    const html = (await storage.get(demo!.htmlStorageKey!))!.toString();
    expect(html).toContain('noindex');
    expect(html).toContain('Unverbindlicher Website-Entwurf');
  }, 120_000);

  it('Freigabe → Veröffentlichung setzt Ablaufdatum und Lead-Status', async () => {
    const demo = (await getDb().select().from(demos).where(eq(demos.leadId, leadId)))[0]!;
    await approveDemo(demo.id, 'admin:test', {
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
    await publishDemo(demo.id, 'admin:test');
    const after = await getDb().query.demos.findFirst({ where: eq(demos.id, demo.id) });
    expect(after?.status).toBe('published');
    const days = (after!.expiresAt!.getTime() - after!.publishedAt!.getTime()) / 86400000;
    expect(Math.round(days)).toBe(30);
    const lead = await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) });
    expect(lead?.status).toBe('demo_published');
  });

  it('Ablehnen mit Neu-Generieren setzt Lead zurück auf qualified', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    const demoId = await buildDemo(other.id, { actor: 'job:test' });
    await qaDemo(demoId, 'job:test', { lighthouse: false });
    await rejectDemo(demoId, 'admin:test', 'Farben passen nicht', true);
    const lead = await getDb().query.leads.findFirst({ where: eq(leads.id, other.id) });
    expect(lead?.status).toBe('qualified');
  }, 60_000);

  it('Review-Regel: erste N manuell, danach Stichprobe nur mit AUTO_APPROVE_DEMOS', async () => {
    await updateConfig({ switches: { autoApproveDemos: false } }, 'test');
    expect(await requiresManualReview(getDb(), 0.99)).toBe(true);
    await updateConfig(
      { switches: { autoApproveDemos: true }, review: { manualReviewFirstN: 1, sampleRatePercent: 10 } },
      'test',
    );
    // bereits 2 manuelle Prüfungen (approve + reject) → Stichprobe
    expect(await requiresManualReview(getDb(), 0.5)).toBe(false);
    expect(await requiresManualReview(getDb(), 0.05)).toBe(true);
  });

  it('KI-Befund „hoch“: einmal automatisch mit den Befunden neu bauen, beim zweiten Mal nur melden', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    registerMockStructured(QA_TOOL_NAME, () => ({
      issues: [{ field: 'about', problem: 'Erfundene Gründungsjahr-Angabe', severity: 'hoch' }],
    }));
    try {
      const first = await buildDemo(other.id, { actor: 'job:test' });
      await qaDemo(first, 'job:test', { lighthouse: false });
      expect((await getDb().query.demos.findFirst({ where: eq(demos.id, first) }))?.status).toBe('qa_failed');
      const boss = await getBoss();
      const jobs = (
        await boss
          .getDb()
          .executeSql(`SELECT data FROM pgboss.job WHERE name = 'build-demo' AND singleton_key = $1`, [`demo-rebuild:${first}`])
      ).rows as { data: { leadId: string; qaFeedback: string[] } }[];
      expect(jobs).toHaveLength(1);
      expect(jobs[0]!.data.leadId).toBe(other.id);
      expect(jobs[0]!.data.qaFeedback).toEqual(['about: Erfundene Gründungsjahr-Angabe']);
      expect(
        await getDb()
          .select()
          .from(alerts)
          .where(eq(alerts.code, `demo_qa_failed:${first}`)),
      ).toHaveLength(0);

      // Neubau (wie der Job): Befunde gehen in den ersten Versuch, Demo trägt qaRetry
      const second = await buildDemo(other.id, { actor: 'job:test', qaFeedback: jobs[0]!.data.qaFeedback });
      const meta = (await getDb().query.demos.findFirst({ where: eq(demos.id, second) }))?.contentJson?._meta as {
        qaRetry?: number;
      };
      expect(meta.qaRetry).toBe(1);
      await qaDemo(second, 'job:test', { lighthouse: false });
      const again = (
        await boss
          .getDb()
          .executeSql(`SELECT 1 FROM pgboss.job WHERE name = 'build-demo' AND singleton_key = $1`, [`demo-rebuild:${second}`])
      ).rows;
      expect(again).toHaveLength(0);
      expect(
        await getDb()
          .select()
          .from(alerts)
          .where(eq(alerts.code, `demo_qa_failed:${second}`)),
      ).toHaveLength(1);
    } finally {
      registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
    }
  }, 90_000);

  it('keeps a controlled single run in manual review without queued QA or a later paid rebuild', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    registerMockStructured(QA_TOOL_NAME, () => ({
      issues: [{ field: 'about', problem: 'Fiktiver Kontrollbefund', severity: 'hoch' }],
    }));
    try {
      const demoId = await buildDemo(other.id, {
        actor: 'operator:controlled-demo-no-send',
        reviewNote: 'Kontrolllauf: tatsächliche manuelle Prüfung steht aus.',
        enqueueQa: false,
      });
      await qaDemo(demoId, 'operator:controlled-demo-no-send', { lighthouse: false, enqueueRebuild: false });
      const demo = await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) });
      expect(demo).toMatchObject({ status: 'qa_failed', reviewRequired: true, publishedAt: null });
      const boss = await getBoss();
      expect(
        (
          await boss
            .getDb()
            .executeSql('SELECT 1 FROM pgboss.job WHERE singleton_key IN ($1, $2)', [`qa:${demoId}`, `demo-rebuild:${demoId}`])
        ).rows,
      ).toHaveLength(0);
    } finally {
      registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
    }
  }, 60_000);
});
