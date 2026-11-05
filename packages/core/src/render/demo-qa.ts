import { visualReviewInput } from '../demos/visual-review';
import { STUDIO_VERSION, STUDIO_REVIEW_SCHEMA, STUDIO_REVIEW_PROMPT, studioReviewResult } from '../demos/studio';
import { recipientFingerprint } from '../letters/binding';
import { leadResearch } from '../services/lead-research';
import { researchContentHash } from '../leads/acquisition';
import { sha256 } from '../util/crypto';
import { assessDemoQuality, type ManualQualityScores } from '../quality/demo';
import { eq } from 'drizzle-orm';
import { getKit, renderSite, slopFindingsForPage, isAuthoredTemplate, checkAuthoredDesign } from '@wbm/templates';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { demos, leads, type QaResult } from '../db/schema';
import { buildQaPrompt, QA_SCHEMA, QA_SYSTEM_PROMPT, QA_TOOL_NAME, validateDemoContent, type QaIssue } from '../demos/content';
import { leadContentFacts, leadToFacts, storedContent } from '../demos/build';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { raiseAlert } from '../services/budget';
import { approveDemo, requiresManualReview } from '../services/demo-review';
import { llmStructured } from '../services/llm';
import { enqueue, QUEUES } from '../queue';
import { browserChecks, lighthouseCheck, validateHtml } from './qa';
import { renderComposite, takeScreenshots } from './screenshots';

type Check = QaResult['checks'][number];

export interface DemoQaOptions {
  /** Reuse only an existing successful AI check bound to exactly the same stored HTML. */
  reuseUnchangedAi?: boolean;
  /** Controlled single runs must not leave a later paid rebuild in the daemon queue. */
  enqueueRebuild?: boolean;
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

  const research = await leadResearch(lead);
  const facts = leadContentFacts(lead, cfg, research);
  const bizFacts = leadToFacts(lead, cfg);
  const checks: Check[] = [];
  const recordedResearch = (demo.contentJson?._meta as { researchHash?: string } | undefined)?.researchHash;
  if (research || recordedResearch)
    checks.push({
      name: 'research_binding',
      passed: recordedResearch === researchContentHash(research),
      details: 'Betriebsfakten müssen zum tatsächlich gerenderten Entwurf passen.',
    });

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
  const meta = (demo.contentJson as { _meta?: { source?: string; qaRetry?: number } } | null)?._meta;
  // Korrekturhinweise für einen automatischen Neubau (Inhaltsregeln + harte KI-Befunde)
  const rebuildFeedback = violations.slice(0, 8).map((v) => `${v.field}: ${v.rule} – ${v.detail}`);
  if (meta?.source === 'fallback')
    checks.push({ name: 'inhaltsquelle', passed: true, details: 'Geprüfte Standardtexte (KI-Ausgabe verworfen)' });

  // Capture once from the stored HTML. Reused for AI review, admin and the bound letter composite.
  const studio = isAuthoredTemplate(demo.templateId);
  const shots = await takeScreenshots(html, { hideDemoChrome: true, studioReview: studio });
  const visual = getKit(demo.templateId) || isAuthoredTemplate(demo.templateId) ? visualReviewInput(shots) : undefined;

  let visualBlocking = false;

  // 2) KI-Prüfung (MODEL_BULK, derselbe Aufruf prüft bei Kits auch beide Startansichten)
  if (opts.reuseUnchangedAi) {
    const prior = demo.qaResultJson?.checks.find((c) => c.name === 'ki-pruefung');
    if (
      !prior?.passed ||
      demo.qaResultJson?.renderedAssets?.htmlHash !== sha256(html) ||
      demo.qaResultJson.renderedAssets.businessFactsHash !== recipientFingerprint(lead) ||
      recordedResearch !== researchContentHash(research)
    )
      throw Error('Vorhandene KI-Prüfung passt nicht unverändert zum HTML; keine kostenfreie Wiederverwendung.');
    checks.push({ ...prior });
    if (studio) {
      const craft = demo.qaResultJson?.checks.find((c) => c.name === STUDIO_VERSION);
      if (!craft?.passed) throw Error('Keine bestandene Studio-Sichtprüfung zum gespeicherten HTML vorhanden.');
      checks.push({ ...craft });
    }
  } else if (opts.llm !== false) {
    try {
      const res = await llmStructured<{ issues: QaIssue[] }>({
        tier: 'bulk',
        system: QA_SYSTEM_PROMPT,
        prompt:
          buildQaPrompt(facts, content) + (visual ? `\n\n${visual.prompt}` : '') + (studio ? `\n\n${STUDIO_REVIEW_PROMPT}` : ''),
        ...(visual ? { images: visual.images } : {}),
        toolName: QA_TOOL_NAME,
        toolDescription: 'Ergebnis der Qualitätsprüfung',
        inputSchema: (studio ? STUDIO_REVIEW_SCHEMA : QA_SCHEMA) as unknown as Record<string, unknown>,
        maxTokens: studio ? 4500 : 3000,
        effort: studio ? 'high' : 'low',
        purpose: 'demo_qa',
        leadId: lead.id,
      });
      const craft = studio ? studioReviewResult(res) : undefined;
      if (craft) checks.push({ name: STUDIO_VERSION, passed: craft.passed, details: craft.details });
      const high = res.issues.filter((i) => i.severity === 'hoch');
      visualBlocking = (craft ? !craft.passed : false) || high.some((i) => i.field.startsWith('visual.'));
      rebuildFeedback.push(...high.slice(0, 8).map((i) => `${i.field}: ${i.problem}`));
      checks.push({
        name: 'ki-pruefung',
        passed: high.length === 0,
        details: [
          studio
            ? 'Desktop/Mobil: Gesamtübersicht und Anfang/Mitte/Ende geprüft; manuelle Abnahme bleibt erforderlich.'
            : visual
              ? 'Startansichten Desktop/Mobil mitgeprüft; ganze Seite manuell prüfen.'
              : '',
          ...res.issues.map((i) => `[${i.severity}] ${i.field}: ${i.problem}`),
        ]
          .filter(Boolean)
          .join(' | '),
      });
    } catch (err) {
      if (studio) {
        visualBlocking = true;
        if (!checks.some((c) => c.name === STUDIO_VERSION))
          checks.push({
            name: STUDIO_VERSION,
            passed: false,
            details: 'Gestaltungsprüfung fehlt oder ist ungültig; keine automatische Ersatzfreigabe.',
          });
      }
      checks.push({ name: 'ki-pruefung', passed: false, details: `Fehler: ${err instanceof Error ? err.message : String(err)}` });
    }
  } else if (studio) {
    checks.push({
      name: STUDIO_VERSION,
      passed: false,
      details: 'KI-Gestaltungsprüfung übersprungen; nur technischer Test, keine abgenommene Gestaltung.',
    });
  }

  if (isAuthoredTemplate(demo.templateId)) {
    const issues = content.design ? checkAuthoredDesign(content.design) : ['Individueller Entwurf fehlt'];
    checks.push({ name: 'freie-gestaltung', passed: issues.length === 0, details: issues.join(' | ') });
  }

  // 3) HTML-Validierung
  checks.push(await validateHtml(html));

  // 3b) KI-Muster (deterministisch über CSS/Markup): Kits müssen frei sein; bei älteren Vorlagen nur ein Hinweis
  {
    const findings = slopFindingsForPage(html);
    const kit = Boolean(getKit(demo.templateId));
    checks.push({
      name: 'ki-muster',
      passed: kit ? findings.length === 0 : true,
      ...(findings.length ? { details: findings.map((x) => `${x.rule}: ${x.detail}`).join(' | ') } : {}),
    });
  }

  // 4) Browser: Konsole, axe, Layout
  checks.push(...(await browserChecks({ html, expectedFacts: { name: bizFacts.name, city: bizFacts.city } })));

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
  // Use exactly the stored page served by the demo route; newer template code must not change its screenshot.
  const composite = await renderComposite(shots.desktop, shots.mobile, { businessName: bizFacts.name });
  const base = `demos/${demoId}`;
  await storage.put(`${base}/desktop.jpg`, shots.desktop, 'image/jpeg');
  await storage.put(`${base}/mobile.jpg`, shots.mobile, 'image/jpeg');
  await storage.put(`${base}/composite.jpg`, composite, 'image/jpeg');
  if (shots.reviewBoards) {
    await storage.put(`${base}/studio-desktop.jpg`, shots.reviewBoards.desktop, 'image/jpeg');
    await storage.put(`${base}/studio-mobile.jpg`, shots.reviewBoards.mobile, 'image/jpeg');
    checks.push({
      name: 'studio-evidence',
      passed: true,
      details: `html=${sha256(html)}; desktop=${sha256(shots.reviewBoards.desktop)}; mobile=${sha256(shots.reviewBoards.mobile)}; assets=${base}/studio-{desktop,mobile}.jpg`,
    });
  }

  const passed = checks.every((c) => c.passed);
  const htmlHash = sha256(html);
  const previousQuality = demo.qaResultJson?.quality;
  const previousScores =
    previousQuality?.passed && previousQuality.htmlHash === htmlHash
      ? (Object.fromEntries(
          previousQuality.dimensions
            .filter((d) => d.key !== 'technical' && typeof d.score === 'number')
            .map((d) => [d.key, d.score]),
        ) as Partial<ManualQualityScores>)
      : undefined;
  const quality = { ...assessDemoQuality(checks, previousScores, cfg.review.qualityMinimum), htmlHash };
  const result: QaResult = {
    renderedAssets: {
      businessFactsHash: recipientFingerprint(lead),
      htmlHash,
      desktopHash: sha256(shots.desktop),
      mobileHash: sha256(shots.mobile),
      compositeHash: sha256(composite),
    },
    passed,
    checkedAt: new Date().toISOString(),
    checks,
    quality,
  };
  // Bereits freigegebene/veröffentlichte Demos behalten ihren Status (QA-Wiederholung)
  const current = await db.query.demos.findFirst({ where: eq(demos.id, demoId), columns: { status: true, reviewNote: true } });
  const decide = ['building', 'pending_review', 'qa_failed'].includes(current?.status ?? '');
  // Mit Prüfhinweis (z. B. Überarbeitung für Brief 3) immer manuell prüfen
  const styleNeedsManual =
    (demo.contentJson?._meta as { designRequiresReview?: boolean } | undefined)?.designRequiresReview === true;
  const manual =
    !quality.complete || styleNeedsManual
      ? true
      : passed && decide
        ? Boolean(current?.reviewNote) || (await requiresManualReview(db))
        : true;
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
  const failedNames = checks.filter((c) => !c.passed).map((c) => c.name);
  const contentOnly =
    !visualBlocking && failedNames.length > 0 && failedNames.every((n) => n === 'ki-pruefung' || n === 'inhaltsregeln');
  if (opts.enqueueRebuild !== false && !passed && decide && contentOnly && !meta?.qaRetry && rebuildFeedback.length) {
    // Nur Textbefunde: einmal automatisch neu schreiben lassen (mit den Befunden), statt liegen zu bleiben
    await enqueue(
      QUEUES.buildDemo,
      {
        leadId: lead.id,
        triggeredBy: 'qa-rebuild',
        templateId: demo.templateId,
        ...(current?.reviewNote ? { reviewNote: current.reviewNote } : {}),
        qaFeedback: rebuildFeedback,
      },
      { singletonKey: `demo-rebuild:${demoId}` },
    );
    await audit(db, { entity: 'demo', entityId: demoId, action: 'qa_auto_rebuild', actor, context: { failed: failedNames } });
  } else if (!passed && decide) {
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
