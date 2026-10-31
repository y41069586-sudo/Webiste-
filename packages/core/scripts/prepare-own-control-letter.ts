/** Prepare the real pipeline's PDF for the configured own address. Never submits postage or starts a daemon. */
import { and, eq } from 'drizzle-orm';
import { getEnv } from '../src/config/env';
import { getConfig } from '../src/config/service';
import { getDb, closeDb } from '../src/db/client';
import { demos, leads, letters } from '../src/db/schema';
import { generateLetter } from '../src/render/letter';
import { assertLetterBinding } from '../src/letters/binding';
import { closeBrowser } from '../src/render/browser';
import { stopBoss } from '../src/queue';
try {
  const id = process.argv.find((a) => a.startsWith('--demo='))?.slice(7);
  if (
    !id ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    process.env.CONTROL_ACCEPTANCE_CONFIRM !== 'own-letter-no-send' ||
    !getEnv().DRY_RUN ||
    getEnv().STRIPE_MODE !== 'test'
  )
    throw Error('Eigener Kontrollbrief und Testmodus müssen ausdrücklich bestätigt sein.');
  const db = getDb(),
    cfg = await getConfig({ fresh: true });
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, id) });
  if (!demo || demo.status !== 'published' || !demo.qaResultJson?.quality?.passed)
    throw Error('Individuell freigegebene veröffentlichte Demo erforderlich.');
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, demo.leadId) });
  if (!lead || lead.source !== 'public_profile') throw Error('Überprüfter Kontrollbetrieb fehlt.');
  const prior = await db.query.letters.findFirst({
    where: and(eq(letters.leadId, lead.id), eq(letters.isTest, true), eq(letters.demoId, id)),
  });
  if (prior) {
    await assertLetterBinding(db, prior, lead, cfg);
    console.log(
      JSON.stringify({
        stage: 'own_letter_already_prepared',
        letterId: prior.id,
        status: prior.status,
        letterSent: false,
        workerStarted: false,
      }),
    );
  } else {
    const result = await generateLetter(lead.id, 1, { actor: 'operator:approved-own-control-letter', test: true });
    console.log(JSON.stringify({ stage: 'own_letter_prepared', ...result, letterSent: false, workerStarted: false }));
  }
} catch (e) {
  console.error(
    JSON.stringify({
      stage: 'blocked',
      reason: e instanceof Error ? e.message.slice(0, 300) : 'Kontrollbrief fehlgeschlagen',
      letterSent: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await closeBrowser();
  await stopBoss();
  await closeDb();
}
