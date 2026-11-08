import { studioQaFixture } from './helpers';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
import { loadOperatorWish, operatorWishPrompt } from '../src/demos/operator-wish';

describe('Demo-Pipeline (Mock-KI, echter Browser)', () => {
  let leadId: string;
  beforeAll(async () => {
    registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    await resetDb();
    await findLeads({ actor: 'job:test', cities: ['Dortmund'] });
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
    // Wunsch des Betreibers bleibt am Betrieb, bis der Neubau gespeichert ist
    const wish = await loadOperatorWish(other.id);
    expect(wish?.note).toBe('Farben passen nicht');
    expect(wish?.demoId).toBe(demoId);
    const prompt = operatorWishPrompt(wish!);
    expect(prompt).toContain('„Farben passen nicht“');
    expect(prompt).toMatch(/nie vor Fakten/);
    const redo = await buildDemo(other.id, { actor: 'job:test', regenerate: true });
    const rebuilt = await getDb().query.demos.findFirst({ where: eq(demos.id, redo) });
    expect((rebuilt?.contentJson as { _meta?: { operatorWish?: { note: string } } } | null)?._meta?.operatorWish?.note).toBe(
      'Farben passen nicht',
    );
    expect(await loadOperatorWish(other.id)).toBeNull();
  }, 90_000);

  it('Ablehnen ohne Neubau speichert keinen Wunsch', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    const demoId = await buildDemo(other.id, { actor: 'job:test' });
    await qaDemo(demoId, 'job:test', { lighthouse: false });
    await rejectDemo(demoId, 'admin:test', 'kein Interesse', false);
    expect(await loadOperatorWish(other.id)).toBeNull();
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
    registerMockStructured(QA_TOOL_NAME, () =>
      studioQaFixture([{ field: 'about', problem: 'Erfundene Gründungsjahr-Angabe', severity: 'hoch' }]),
    );
    try {
      const first = await buildDemo(other.id, { actor: 'job:test' });
      await qaDemo(first, 'job:test', { lighthouse: false });
      expect((await getDb().query.demos.findFirst({ where: eq(demos.id, first) }))?.status).toBe('qa_failed');
      const boss = await getBoss();
      const jobs = (
        await boss
          .getDb()
          .executeSql(`SELECT data FROM pgboss.job WHERE name = 'build-demo' AND singleton_key = $1`, [`demo:${other.id}`])
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
          .executeSql(`SELECT 1 FROM pgboss.job WHERE name = 'build-demo' AND singleton_key = $1`, [`demo:${other.id}`])
      ).rows;
      expect(again).toHaveLength(1); // The first pending rebuild remains; no second job for this lead.
      expect(
        await getDb()
          .select()
          .from(alerts)
          .where(eq(alerts.code, `demo_qa_failed:${second}`)),
      ).toHaveLength(1);
    } finally {
      registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    }
  }, 90_000);

  it('Gestaltungsbefunde blockieren nie: Demo geht mit Hinweis in die manuelle Prüfung', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    await updateConfig({ switches: { autoApproveDemos: true }, review: { manualReviewFirstN: 0, sampleRatePercent: 0 } }, 'test');
    registerMockStructured(QA_TOOL_NAME, () => {
      const f = studioQaFixture();
      f.craft[2] = { ...f.craft[2]!, verdict: 'revise', correction: 'Abstand unter der Bildstrecke etwas verringern.' };
      return f;
    });
    try {
      const demoId = await buildDemo(other.id, { actor: 'job:test' });
      const result = await qaDemo(demoId, 'job:test', { lighthouse: false });
      expect(result.passed, JSON.stringify(result.checks.filter((c) => !c.passed))).toBe(true);
      const demo = await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) });
      expect(demo).toMatchObject({ status: 'pending_review', reviewRequired: true });
      expect(result.checks.find((c) => c.name === 'design-studio-1')?.details).toMatch(
        /^Hinweis für die manuelle Prüfung \(kein Blocker\): Gestaltung rhythm/,
      );
    } finally {
      registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
      await updateConfig({ switches: { autoApproveDemos: false } }, 'test');
    }
  }, 90_000);

  it('keeps a controlled single run in manual review without queued QA or a later paid rebuild', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    registerMockStructured(QA_TOOL_NAME, () =>
      studioQaFixture([{ field: 'about', problem: 'Fiktiver Kontrollbefund', severity: 'hoch' }]),
    );
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
      registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    }
  }, 60_000);

  it('reuses successful AI only for unchanged HTML and rejects a modified snapshot', async () => {
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    const id = await buildDemo(lead.id, { actor: 'test:reuse', enqueueQa: false, reviewNote: 'Controlled review' });
    expect((await qaDemo(id, 'test:reuse', { lighthouse: false, enqueueRebuild: false })).passed).toBe(true);
    registerMockStructured(QA_TOOL_NAME, () => {
      throw Error('AI must not be called again');
    });

    const demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
    const storage = getProviders().storage,
      html = (await storage.get(demo.htmlStorageKey!))!;
    try {
      expect((await qaDemo(id, 'test:reuse', { lighthouse: false, reuseUnchangedAi: true, enqueueRebuild: false })).passed).toBe(
        true,
      );
      await storage.put(demo.htmlStorageKey!, Buffer.concat([html, Buffer.from('<!-- changed -->')]), 'text/html');
      await expect(qaDemo(id, 'test:reuse', { reuseUnchangedAi: true })).rejects.toThrow('passt nicht unverändert');
    } finally {
      await storage.put(demo.htmlStorageKey!, html, 'text/html');
      registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    }
  }, 60_000);
  it('keeps a completed visual verdict across a later technical failure without paying for another review', async () => {
    const other = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0]!;
    const id = await buildDemo(other.id, { actor: 'test:checkpoint', enqueueQa: false });
    let reviews = 0;
    registerMockStructured(QA_TOOL_NAME, () => {
      reviews++;
      return studioQaFixture();
    });
    const put = vi.spyOn(getProviders().storage, 'put').mockRejectedValueOnce(Error('Simulated artifact write failure'));
    try {
      const failed = await qaDemo(id, 'test:checkpoint', { lighthouse: false, enqueueRebuild: false });
      expect(failed.passed).toBe(false);
      expect((await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))?.status).toBe('qa_failed');
      expect(failed.visualCheckpoint).toBeDefined();
    } finally {
      put.mockRestore();
    }
    try {
      expect((await qaDemo(id, 'test:checkpoint', { lighthouse: false, enqueueRebuild: false })).passed).toBe(true);
      expect(reviews).toBe(1);
    } finally {
      registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    }
  }, 90_000);
});
