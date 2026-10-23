import { eq } from 'drizzle-orm';
import { renderSite } from '@wbm/templates';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { demos, leads, type QaResult } from '../db/schema';
import { buildQaPrompt, QA_SCHEMA, QA_SYSTEM_PROMPT, QA_TOOL_NAME, validateDemoContent, type QaIssue } from '../demos/content';
import { leadContentFacts, leadToFacts, renderDemoHtml, storedContent } from '../demos/build';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { raiseAlert } from '../services/budget';
import { approveDemo, requiresManualReview } from '../services/demo-review';
import { llmStructured } from '../services/llm';
import { browserChecks, lighthouseCheck, validateHtml } from './qa';
import { renderComposite, takeScreenshots } from './screenshots';

type Check = QaResult['checks'][number];

export interface DemoQaOptions {
  /** Lighthouse ausführen (langsam, ~8 s) */
  lighthouse?: boolean;
  /** KI-Prüfung ausführen */
  llm?: boolean;
}

/**
 * Vollständige QA einer Demo: Inhaltsregeln (Code + KI), HTML-Validierung,
 * Konsolenfehler, axe-core (Desktop/Mobil), Layout-Prüfung, Lighthouse.
 * Danach Screenshots + Komposit; Status pending_review / approved / qa_failed.
 */
export async function qaDemo(demoId: string, actor: string, opts: DemoQaOptions = {}): Promise<QaResult> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, demoId) });
  if (!demo) throw new Error('Demo nicht gefunden');
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, demo.leadId) });
  if (!lead) throw new Error('Lead nicht gefunden');
  const content = storedContent(demo.contentJson);
  if (!content) throw new Error('Demo ohne Inhalt');
  const storage = getProviders().storage;
  const html = (await storage.get(demo.htmlStorageKey ?? ''))?.toString('utf8');
  if (!html) throw new Error('Demo-HTML fehlt im Speicher');

  const facts = leadContentFacts(lead, cfg);
  const bizFacts = leadToFacts(lead, cfg);
  const checks: Check[] = [];

  // 1) Inhaltsregeln (Code)
  const violations = validateDemoContent(content, facts);
  checks.push({
    name: 'inhaltsregeln',
    passed: violations.length === 0,
    ...(violations.length
      ? {
          details: violations
            .slice(0, 10)
            .map((v) => `${v.field}: ${v.rule} – ${v.detail}`)
            .join(' | '),
        }
      : {}),
  });
  const meta = (demo.contentJson as { _meta?: { source?: string } } | null)?._meta;
  if (meta?.source === 'fallback')
    checks.push({ name: 'inhaltsquelle', passed: true, details: 'Geprüfte Standardtexte (KI-Ausgabe verworfen)' });

  // 2) KI-Prüfung (MODEL_BULK)
  if (opts.llm !== false) {
    try {
      const res = await llmStructured<{ issues: QaIssue[] }>({
        tier: 'bulk',
        system: QA_SYSTEM_PROMPT,
        prompt: buildQaPrompt(facts, content),
        toolName: QA_TOOL_NAME,
        toolDescription: 'Ergebnis der Qualitätsprüfung',
        inputSchema: QA_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 3000,
        effort: 'low',
        purpose: 'demo_qa',
        leadId: lead.id,
      });
      const high = res.issues.filter((i) => i.severity === 'hoch');
      checks.push({
        name: 'ki-pruefung',
        passed: high.length === 0,
        ...(res.issues.length ? { details: res.issues.map((i) => `[${i.severity}] ${i.field}: ${i.problem}`).join(' | ') } : {}),
      });
    } catch (err) {
      checks.push({ name: 'ki-pruefung', passed: false, details: `Fehler: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // 3) HTML-Validierung
  checks.push(await validateHtml(html));

  // 4) Browser: Konsole, axe, Layout
  checks.push(...(await browserChecks({ html })));

  // 5) Lighthouse auf der Live-Variante (ohne Banner/noindex)
  if (opts.lighthouse !== false) {
    try {
      const liveHtml = renderSite({
        templateId: demo.templateId,
        palette: demo.palette,
        mode: 'live',
        content,
        facts: bizFacts,
        live: {
          formAction: '/api/forms/qa',
          imprintPath: 'impressum.html',
          privacyPath: 'datenschutz.html',
          canonicalUrl: 'http://127.0.0.1/',
        },
      });
      checks.push(await lighthouseCheck(liveHtml));
    } catch (err) {
      checks.push({ name: 'lighthouse', passed: false, details: `Fehler: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // 6) Screenshots + Komposit (ohne Banner)
  const shotHtml = renderDemoHtml({
    templateId: demo.templateId,
    palette: demo.palette,
    content,
    facts: bizFacts,
    slug: demo.slug,
    cfg,
    mode: 'screenshot',
  });
  const shots = await takeScreenshots(shotHtml);
  const composite = await renderComposite(shots.desktop, shots.mobile);
  const base = `demos/${demoId}`;
  await storage.put(`${base}/desktop.jpg`, shots.desktop, 'image/jpeg');
  await storage.put(`${base}/mobile.jpg`, shots.mobile, 'image/jpeg');
  await storage.put(`${base}/composite.jpg`, composite, 'image/jpeg');

  const passed = checks.every((c) => c.passed);
  const result: QaResult = { passed, checkedAt: new Date().toISOString(), checks };
  // Bereits freigegebene/veröffentlichte Demos behalten ihren Status (QA-Wiederholung)
  const current = await db.query.demos.findFirst({ where: eq(demos.id, demoId), columns: { status: true, reviewNote: true } });
  const decide = ['building', 'pending_review', 'qa_failed'].includes(current?.status ?? '');
  // Mit Prüfhinweis (z. B. Überarbeitung für Brief 3) immer manuell prüfen
  const manual = passed && decide ? Boolean(current?.reviewNote) || (await requiresManualReview(db)) : true;
  await db
    .update(demos)
    .set({
      qaResultJson: result,
      screenshotDesktopKey: `${base}/desktop.jpg`,
      screenshotMobileKey: `${base}/mobile.jpg`,
      compositeKey: `${base}/composite.jpg`,
      ...(decide ? { status: passed ? ('pending_review' as const) : ('qa_failed' as const), reviewRequired: manual } : {}),
      updatedAt: new Date(),
    })
    .where(eq(demos.id, demoId));
  await audit(db, {
    entity: 'demo',
    entityId: demoId,
    action: passed ? 'qa_passed' : 'qa_failed',
    actor,
    context: { failed: checks.filter((c) => !c.passed).map((c) => c.name) },
  });
  if (!passed && decide) {
    await raiseAlert(db, {
      level: 'warn',
      code: `demo_qa_failed:${demoId}`,
      message: `Demo-QA fehlgeschlagen (${checks
        .filter((c) => !c.passed)
        .map((c) => c.name)
        .join(', ')}).`,
      context: { demoId, leadId: lead.id },
    });
  } else if (decide && !manual) {
    // Automatische Freigabe (nur nach den ersten N manuellen Prüfungen und mit AUTO_APPROVE_DEMOS)
    await approveDemo(demoId, 'job:auto-approve', { manual: false });
  }
  logger.info({ demoId, passed, manual }, 'demo-qa abgeschlossen');
  return result;
}
