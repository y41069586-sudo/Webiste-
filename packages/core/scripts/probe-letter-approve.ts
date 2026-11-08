/**
 * Diagnose (nur lesen): zeigt je wartendem Brief, welche Freigabe-Bedingung scheitert.
 * Aufruf im Worker-Container: node --import tsx /repo/packages/core/scripts/probe-letter-approve.ts
 */
import { eq } from 'drizzle-orm';
import { getConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { leads, letters } from '../src/db/schema';
import { assertLetterLeadEligible } from '../src/letters/eligibility';
import { assertLetterBinding } from '../src/letters/binding';
import { assessLetterQuality } from '../src/quality/letter';

async function main() {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const rows = await db.select().from(letters).where(eq(letters.status, 'generated'));
  for (const letter of rows) {
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, letter.leadId) });
    const out: Record<string, unknown> = { id: letter.id.slice(0, 8), seq: letter.sequence, test: letter.isTest };
    if (!lead) {
      out.fehler = 'Betrieb fehlt';
      console.log(JSON.stringify(out));
      continue;
    }
    try {
      await assertLetterLeadEligible(db, lead, cfg, { testLetter: letter.isTest });
      out.eligibility = 'ok';
    } catch (e) {
      out.eligibility = String((e as Error).message).slice(0, 120);
    }
    try {
      await assertLetterBinding(db, letter, lead, cfg);
      out.binding = 'ok';
    } catch (e) {
      out.binding = String((e as Error).message).slice(0, 160);
    }
    out.truthPassed = (letter.truthCheckJson as { passed?: boolean } | null)?.passed === true;
    const prev = (letter.truthCheckJson as { _quality?: { dimensions: { key: string; score: number | null }[] } } | null)
      ?._quality;
    const technical = prev?.dimensions.some((d) => d.key === 'technical' && d.score === 100) ?? false;
    const q = assessLetterQuality(
      [{ passed: technical }],
      Object.fromEntries(['personalization', 'industry', 'text', 'visual', 'screenshot'].map((k) => [k, 82])) as never,
      cfg.review.letterQualityMinimum,
    );
    out.qualityMitGut = q.passed ? 'ok' : `zu niedrig (${q.total})`;
    console.log(JSON.stringify(out));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
