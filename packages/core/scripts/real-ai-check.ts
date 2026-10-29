/**
 * Qualitätslauf mit echter KI (vor jedem Livegang und nach Änderungen an Texten, Prompts oder Templates):
 * Je Branche ein erfundener Betrieb → Demo bauen → komplette QA (inkl. KI-Prüfung und Layout) → freigeben →
 * veröffentlichen → Erstbrief erzeugen (Wahrheits-Check, PDF-Prüfung). Ausgabe: je Schritt bestanden/Befund.
 *
 *   DATABASE_URL=postgres://wbm:wbm@localhost:5432/wbm_realcheck_test LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=… \
 *   pnpm --filter @wbm/core exec tsx scripts/real-ai-check.ts maler friseur cafe
 *
 * Nur lokal: legt die Datenbank neu an. Kosten ca. 0,20–0,40 € je Branche (im lokalen Ledger sichtbar).
 */
import pg from 'pg';

const DEFAULT_BRANCHES = ['maler', 'elektriker', 'sanitaer', 'friseur', 'kosmetikstudio', 'cafe', 'blumenladen', 'yogastudio'];

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? 'postgres://invalid/invalid');
  const dbName = url.pathname.slice(1);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^wbm_realcheck_test$/.test(dbName))
    throw new Error('Nur lokal mit DATABASE_URL …/wbm_realcheck_test.');
  for (const k of [
    'PAYMENT_PROVIDER',
    'EMAIL_PROVIDER',
    'MAIL_PROVIDER',
    'REGISTRAR_PROVIDER',
    'HOSTING_PROVIDER',
    'LEAD_SOURCE',
  ])
    if (process.env[k] !== 'mock') throw new Error(`${k} muss mock sein (keine echten Briefe, Zahlungen, Domains).`);
  if (process.env.LLM_PROVIDER !== 'anthropic' || !process.env.ANTHROPIC_API_KEY)
    throw new Error('Echte KI: LLM_PROVIDER=anthropic und ANTHROPIC_API_KEY setzen.');

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const c = new pg.Client({ connectionString: admin.toString() });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${dbName}"`);
  await c.end();

  const { runMigrations } = await import('../src/db/migrate');
  const { seedDefaults, ensureLetterVariants } = await import('../src/services/seed');
  const { updateConfig, getConfig } = await import('../src/config/service');
  const { getDb, closeDb } = await import('../src/db/client');
  const { leads } = await import('../src/db/schema');
  const { buildDemo, qaDemo, generateLetter, closeBrowser } = await import('../src/render');
  const { approveDemo, publishDemo } = await import('../src/services/demo-review');
  const { stopBoss } = await import('../src/queue');
  const { randomToken } = await import('../src/util/crypto');
  const { OPERATOR_TEST_CONFIG } = await import('../test/helpers');
  const { quickResearch } = await import('../src/services/workflow');
  const { saveLeadResearch } = await import('../src/services/lead-research');
  const { WEBSITE_METHODS } = await import('../src/leads/acquisition');
  const { libraryContent } = await import('../src/demos/library');

  await runMigrations();
  await seedDefaults();
  // Erfundene Betreiberdaten in der Länge echter Angaben (lange E-Mail/Telefon wie im Testlauf)
  await updateConfig(
    {
      ...OPERATOR_TEST_CONFIG,
      sender: {
        ...OPERATOR_TEST_CONFIG.sender,
        name: 'Vorname Langername-Beispiel',
        email: 'kontakt@beispiel-webdesign.world',
        phone: '+49 1521 0000000',
        photoUrl: '', // wie Produktion: kein persönliches Foto
      },
      offers: { activeVersion: 'v4' },
    } as never,
    'realcheck',
  );
  const db = getDb();
  await ensureLetterVariants(db, 'v4');
  const cfg = await getConfig({ fresh: true });
  // --fakten: jeder Betrieb bekommt belegte Rechercheangaben (Leistungen, Beobachtung, Website-Suche),
  // damit auch der KI-Briefschreiber und sein Abgleich mit der Demo laufen
  const withFacts = process.argv.includes('--fakten');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const keys = args.length ? args : DEFAULT_BRANCHES;
  const results: Record<string, unknown>[] = [];
  for (const key of keys) {
    const branch = cfg.targeting.branches.find((b) => b.key === key);
    if (!branch) {
      results.push({ branch: key, error: 'unbekannte Branche' });
      continue;
    }
    const row: Record<string, unknown> = { branch: key };
    try {
      const [lead] = await db
        .insert(leads)
        .values({
          source: 'mock',
          sourceId: `realcheck-${randomToken(8)}`,
          businessName: `${branch.label} Beispiel Dortmund`,
          branch: branch.key,
          branchGroup: branch.group,
          city: 'Dortmund',
          street: 'Beispielstraße',
          houseNumber: '12a',
          postalCode: '44137',
          phone: '0231 0000000',
          segmentKey: `test:${branch.group}:${branch.key}`,
          trackToken: randomToken(24),
          identityHash: randomToken(16),
          status: 'qualified',
        })
        .returning();
      if (withFacts) {
        const services = libraryContent(
          branch.key,
          branch.group,
          { name: lead!.businessName, stadt: 'Dortmund', branche: branch.label },
          1,
        )
          .services.map((x) => x.title)
          .filter((t) => t.length <= 40 && !/anfrag|abstimm/i.test(t))
          .slice(0, 2);
        await saveLeadResearch(
          lead!.id,
          quickResearch({
            websiteFound: false,
            methods: [...WEBSITE_METHODS],
            addressOk: true,
            operational: true,
            independent: true,
            privateClients: true,
            businessClients: false,
            services,
            demand: {
              kind: 'new_offer',
              text: `Im Profil wird ein neues Angebot für ${services[0] ?? branch.label} angekündigt`,
            },
            lawfulUse: true,
          }),
          'realcheck',
        );
        row.fakten = services;
      }
      const demoId = await buildDemo(lead!.id, { actor: 'realcheck' });
      const qa = await qaDemo(demoId, 'realcheck', { lighthouse: false, llm: true });
      const failed = qa.checks.filter((x) => !x.passed);
      row.demo = failed.length ? failed.map((x) => `${x.name}: ${x.details ?? ''}`) : 'ok';
      row.kiHinweise = qa.checks.find((x) => x.name === 'ki-pruefung')?.details ?? '';
      if (!failed.length) {
        await approveDemo(demoId, 'admin:realcheck', {
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
        await publishDemo(demoId, 'admin:realcheck');
        const letter = await generateLetter(lead!.id, 1, { actor: 'realcheck' });
        row.brief =
          letter.status === 'failed' || letter.issues.length || letter.truthCheck?.passed === false
            ? {
                status: letter.status,
                issues: letter.issues.map((i) => `${i.check}: ${i.detail}`),
                wahrheit: letter.truthCheck?.violations?.map((v) => `${v.rule}: ${v.detail}`),
              }
            : 'ok';
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message.slice(0, 400) : String(err);
    }
    results.push(row);
    console.log(JSON.stringify(row));
  }
  const ok = results.filter((r) => r.demo === 'ok' && r.brief === 'ok').length;
  console.log(`\nERGEBNIS: ${ok} von ${results.length} Branchen komplett grün`);
  await closeBrowser();
  await stopBoss();
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
