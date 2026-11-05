/** One fictional design sample through the normal authoring and paid-review path. No lead/demo/queue writes. */
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderSite, authoredTemplateId, stockPhotos, stockPhotoDataUri, type BusinessFacts } from '@wbm/templates';
import { authorStudioContent } from '../src/demos/studio-author';
import {
  STUDIO_VERSION,
  STUDIO_REVIEW_SCHEMA,
  STUDIO_REVIEW_PROMPT,
  STUDIO_CALL_OPTIONS,
  studioReviewResult,
} from '../src/demos/studio';
import { buildQaPrompt, QA_TOOL_NAME, QA_SYSTEM_PROMPT, type ContentFacts } from '../src/demos/content';
import { visualReviewInput } from '../src/demos/visual-review';
import { effectiveSwitches, getConfig } from '../src/config/service';
import { getEnv } from '../src/config/env';
import { closeDb } from '../src/db/client';
import { llmStructured } from '../src/services/llm';
import { closeBrowser } from '../src/render/browser';
import { takeScreenshots } from '../src/render/screenshots';
import { browserChecks, lighthouseCheck, validateHtml } from '../src/render/qa';
import { sha256 } from '../src/util/crypto';

const output = path.resolve(process.argv.find((x) => x.startsWith('--out='))?.slice(6) ?? '/preview');
let claimed = false;
const save = (name: string, value: unknown) =>
  writeFile(path.join(output, name), JSON.stringify(value, null, 2), { mode: 0o600 });
try {
  if (process.env.STUDIO_PREVIEW_CONFIRM !== 'one-fictional-demo-no-send') throw Error('Testbestätigung fehlt.');
  if (!getEnv().ANTHROPIC_API_KEY || getEnv().LLM_PROVIDER !== 'anthropic' || !getEnv().DRY_RUN)
    throw Error('Echter Anthropic-Key, LLM_PROVIDER=anthropic und DRY_RUN=true erforderlich.');
  for (const key of [
    'PAYMENT_PROVIDER',
    'EMAIL_PROVIDER',
    'MAIL_PROVIDER',
    'REGISTRAR_PROVIDER',
    'HOSTING_PROVIDER',
    'LEAD_SOURCE',
  ])
    if (process.env[key] !== 'mock') throw Error(`${key} muss für diesen isolierten Test mock sein.`);
  const cfg = await getConfig({ fresh: true });
  if (effectiveSwitches(cfg).killSwitch)
    throw Error('Not-Aus ist aktiv. Der Einzeltest respektiert die Sperre; Worker pausiert lassen und im Admin prüfen.');
  await mkdir(output, { recursive: true, mode: 0o700 });
  // Exclusive marker stays after failure too: rerunning the command must not silently buy another attempt.
  const lock = await open(path.join(output, 'started.json'), 'wx', 0o600);
  await lock.writeFile(JSON.stringify({ version: STUDIO_VERSION, startedAt: new Date().toISOString(), fictional: true }));
  await lock.close();
  claimed = true;

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
  console.log(JSON.stringify({ stage: 'authoring_one_fictional_demo', version: STUDIO_VERSION }));
  const generated = await authorStudioContent(facts, { photos, onPlan: (plan) => save('plan.json', plan) });
  await save('content.json', generated);
  const business: BusinessFacts = { ...facts, openingLines: [], photos };
  const html = renderSite({
    templateId: authoredTemplateId('handwerk'),
    palette: 'custom',
    mode: 'screenshot',
    content: generated.content,
    facts: business,
  });
  await writeFile(path.join(output, 'index.html'), html, { mode: 0o600 });
  const shots = await takeScreenshots(html, { hideDemoChrome: true, studioReview: true });
  if (!shots.reviewBoards) throw Error('Prüftafeln fehlen.');
  await writeFile(path.join(output, 'desktop.jpg'), shots.desktop, { mode: 0o600 });
  await writeFile(path.join(output, 'mobile.jpg'), shots.mobile, { mode: 0o600 });
  await writeFile(path.join(output, 'studio-desktop.jpg'), shots.reviewBoards.desktop, { mode: 0o600 });
  await writeFile(path.join(output, 'studio-mobile.jpg'), shots.reviewBoards.mobile, { mode: 0o600 });
  const visual = visualReviewInput(shots);
  console.log(JSON.stringify({ stage: 'independent_visual_review' }));
  const raw = await llmStructured<unknown>({
    tier: 'bulk',
    system: QA_SYSTEM_PROMPT,
    prompt: buildQaPrompt(facts, generated.content) + '\n\n' + visual.prompt + '\n\n' + STUDIO_REVIEW_PROMPT,
    images: visual.images,
    toolName: QA_TOOL_NAME,
    toolDescription: 'Unabhängige Inhalts- und Gestaltungsprüfung.',
    inputSchema: STUDIO_REVIEW_SCHEMA,
    ...STUDIO_CALL_OPTIONS.review,
    purpose: 'demo_qa',
  });
  await save('visual-review.json', raw);
  const craft = studioReviewResult(raw);
  const checks = [
    await validateHtml(html),
    ...(await browserChecks({ html, expectedFacts: { name: facts.name, city: facts.city } })),
  ];
  // Same live renderer as regular QA; this is a local artifact, never published or submitted.
  const live = renderSite({
    templateId: authoredTemplateId('handwerk'),
    palette: 'custom',
    mode: 'live',
    content: generated.content,
    facts: business,
    live: { formAction: '/disabled-design-test', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
  });
  checks.push(await lighthouseCheck(live));
  const result = {
    stage: 'awaiting_manual_visual_review',
    fictional: true,
    version: STUDIO_VERSION,
    htmlHash: sha256(html),
    desktopHash: sha256(shots.reviewBoards.desktop),
    mobileHash: sha256(shots.reviewBoards.mobile),
    contentPassed: !craft.issues.some((x) => x.severity === 'hoch'),
    craftPassed: craft.passed,
    technicalPassed: checks.every((x) => x.passed),
    checks,
    visualDetails: craft.details,
    manualApproved: false,
    demoPublished: false,
    workerStarted: false,
  };
  await save('result.json', result);
  console.log(JSON.stringify(result));
} catch (error) {
  const reason =
    error instanceof Error ? error.message.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[secret]').slice(0, 600) : 'Test fehlgeschlagen';
  const result = { stage: 'blocked', reason, workerStarted: false };
  if (claimed) await save('result.json', result);
  console.error(JSON.stringify(result));
  process.exitCode = 1;
} finally {
  await closeBrowser();
  await closeDb();
}
