/** Inspect an already-paid fictional candidate. No LLM, configuration/database, queue or approval calls. */
import { readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderSite,
  authoredTemplateId,
  checkAuthoredDesign,
  stockPhotos,
  stockPhotoDataUri,
  type SiteContent,
} from '@wbm/templates';
import { normalizeContent, validateDemoContent, type ContentFacts } from '../src/demos/content';
import { STUDIO_VERSION } from '../src/demos/studio';
import { sha256 } from '../src/util/crypto';

export async function recoverStudioPreview(directory: string) {
  if (process.env.STUDIO_PREVIEW_RECOVER_CONFIRM !== 'existing-fictional-only-no-ai')
    throw Error('Bestätigung für die kostenfreie Wiederherstellung fehlt.');
  try {
    await lstat(path.join(directory, 'index.html'));
    throw Error('HTML bereits vorhanden; vorhandene Ansicht teilen statt überschreiben.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const started = JSON.parse(await readFile(path.join(directory, 'started.json'), 'utf8')) as {
    fictional?: boolean;
    version?: string;
  };
  if (started.fictional !== true || started.version !== STUDIO_VERSION)
    throw Error('Kein passender fiktiver Studio-Startnachweis; nichts gerendert.');
  let source: Buffer | undefined;
  let attempt = 2;
  for (; attempt >= 1; attempt--) {
    try {
      source = await readFile(path.join(directory, `attempt-${attempt}.json`));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (!source || source.length > 1024 * 1024) throw Error('Kein passender gespeicherter Umsetzungsversuch; kein KI-Neubau.');
  const saved = JSON.parse(source.toString('utf8')) as { content: SiteContent };
  const content = normalizeContent(saved.content);
  if (!content.design) throw Error('Gespeicherter Versuch enthält keinen freien Entwurf.');
  const safetyIssues = checkAuthoredDesign(content.design);
  if (safetyIssues.length) throw Error(`Gespeicherter Entwurf verletzt die HTML/CSS-Sandbox: ${safetyIssues.join(' | ')}`);
  const photos = stockPhotos('handwerk', 0, 'Elektroinstallation')
    .slice(0, 3)
    .map((p) => ({
      src: stockPhotoDataUri(p),
      alt: p.alt,
      origin: 'example' as const,
      rightsConfirmed: true,
    }));
  const facts: ContentFacts = {
    name: 'Elektro Kontur · fiktiver Testbetrieb',
    branchLabel: 'Elektroinstallation',
    branchKey: 'elektriker',
    group: 'handwerk',
    city: 'Bochum',
    street: 'Beispielweg',
    houseNumber: '1',
    postalCode: '44803',
    phone: null,
    hasOpeningHours: false,
    socialOnly: false,
    requireFullPage: true,
    imageBrief: photos.map((p, i) => ({ slot: i + 1, alt: p.alt, example: true })),
  };
  const violations = validateDemoContent(content, facts);
  const rendered = renderSite({
    templateId: authoredTemplateId('handwerk'),
    palette: 'custom',
    mode: 'screenshot',
    content,
    facts: { ...facts, openingLines: [], photos },
  });
  // This is diagnostic viewing, never a passed demo. The label is outside model-authored CSS/HTML.
  const notice =
    '<aside role="note" style="position:relative;z-index:10000;padding:14px 20px;background:#fff0c2;color:#292013;font:700 16px/1.5 system-ui;text-align:center">' +
    'SeitenWerk · Fiktiver Prüfentwurf · Nicht freigegeben. Inhalts- und Gestaltungsprüfung offen.</aside>';
  if (!/<body\b[^>]*>/i.test(rendered)) throw Error('Gerenderte Testseite ist unvollständig.');
  const html = rendered.replace(/<body\b[^>]*>/i, (body) => body + notice);
  const report = {
    stage: 'recovered_unapproved_candidate',
    fictional: true,
    sourceAttempt: attempt,
    sourceHash: sha256(source),
    htmlHash: sha256(html),
    violations,
    ruleChecksPassed: violations.length === 0,
    contentPassed: false,
    craftPassed: false,
    technicalPassed: false,
    reviewPerformed: false,
    technicalChecksRun: false,
    manualApproved: false,
    demoPublished: false,
    workerStarted: false,
    newAiCalls: 0,
  };
  // Keep the original paid-start marker, attempts and blocked result intact. Never overwrite an existing page.
  await writeFile(path.join(directory, 'recovered-content.json'), JSON.stringify(content, null, 2), { mode: 0o600 });
  await writeFile(path.join(directory, 'recovery.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  await writeFile(path.join(directory, 'index.html'), html, { mode: 0o600, flag: 'wx' });
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  recoverStudioPreview('/preview')
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(
        JSON.stringify({
          stage: 'recovery_blocked',
          reason: error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen',
          newAiCalls: 0,
        }),
      );
      process.exitCode = 1;
    });
}
