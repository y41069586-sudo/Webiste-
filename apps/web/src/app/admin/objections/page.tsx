import { desc, isNotNull } from 'drizzle-orm';
import {
  addDays,
  getDb,
  OBJECTION_CATEGORIES,
  OBJECTION_LABEL,
  objectionStats,
  objectionTrend,
  schema,
  type ObjectionCategory,
} from '@wbm/core';
import { Card, Notice, PageHeader, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, num } from '@/lib/format';
import { recordObjectionAction } from './actions';

export const metadata = { title: 'Einwände' };
export const dynamic = 'force-dynamic';

const INDUSTRY_LABEL: Record<string, string> = {
  gastronomie: 'Gastronomie',
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  einzelhandel: 'Einzelhandel',
  kurse_training: 'Kurse & Training',
  dienstleistung: 'Dienstleistung',
  unbekannt: 'ohne Branche',
};

export default async function ObjectionsPage({ searchParams }: { searchParams: Promise<{ einwand?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const [recent4, all, trend, latest] = await Promise.all([
    objectionStats(addDays(new Date(), -28)),
    objectionStats(new Date('2020-01-01T00:00:00Z')),
    objectionTrend(12),
    db
      .select()
      .from(schema.objections)
      .where(isNotNull(schema.objections.text))
      .orderBy(desc(schema.objections.createdAt))
      .limit(20),
  ]);
  const industries = [...new Set(all.map((s) => s.industry))];
  const weeks = [...new Set(trend.map((t) => t.week))];
  const cats = OBJECTION_CATEGORIES.filter((c) => trend.some((t) => t.category === c));
  return (
    <>
      <PageHeader
        title="Einwände"
        subtitle="Vom Support-Agent aus Formular- und E-Mail-Fragen erkannt, WhatsApp-Fragen von Hand erfasst. Kategorien bleiben, Texte werden nach 90 Tagen gelöscht."
      />
      {sp.einwand ? (
        <div className="mb-4">
          <Notice kind={sp.einwand === 'keiner' ? 'info' : 'success'}>
            {sp.einwand === 'keiner'
              ? 'Kein Einwand erkannt – nichts gespeichert.'
              : `Erfasst als ${OBJECTION_LABEL[sp.einwand as ObjectionCategory] ?? sp.einwand}.`}
          </Notice>
        </div>
      ) : null}
      <div className="grid gap-6">
        <Card title="Top-Einwände je Branche">
          <Table head={['Branche', 'letzte 4 Wochen', 'gesamt']} empty="Noch keine Einwände erfasst.">
            {industries.map((ind) => (
              <tr key={ind}>
                <Td>{INDUSTRY_LABEL[ind] ?? ind}</Td>
                <Td>
                  {recent4
                    .filter((s) => s.industry === ind)
                    .slice(0, 3)
                    .map((s) => `${OBJECTION_LABEL[s.category]} ${num(s.count)}×`)
                    .join(' · ') || '–'}
                </Td>
                <Td>
                  {all
                    .filter((s) => s.industry === ind)
                    .slice(0, 3)
                    .map((s) => `${OBJECTION_LABEL[s.category]} ${num(s.count)}×`)
                    .join(' · ')}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Verlauf (12 Wochen)">
          <Table head={['Woche', ...cats.map((c) => OBJECTION_LABEL[c])]} empty="Noch kein Verlauf.">
            {weeks.map((w) => (
              <tr key={w}>
                <Td>{w}</Td>
                {cats.map((c) => (
                  <Td key={c}>{num(trend.find((t) => t.week === w && t.category === c)?.count ?? 0)}</Td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="WhatsApp-Frage erfassen">
          <form action={recordObjectionAction} className="grid gap-3 sm:grid-cols-[1fr_16rem]">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="text">
                Text der Nachricht (ohne Namen und Telefonnummer)
              </label>
              <textarea id="text" name="text" rows={3} className={input} required />
            </div>
            <div>
              <label className={label} htmlFor="leadId">
                Lead-ID (optional, für die Branche)
              </label>
              <input id="leadId" name="leadId" className={input} placeholder="aus dem Lead-Detail" />
            </div>
            <div>
              <label className={label} htmlFor="source">
                Quelle
              </label>
              <select id="source" name="source" className={input} defaultValue="whatsapp">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-Mail (manuell)</option>
              </select>
            </div>
            <div>
              <button type="submit" className={btn.primary}>
                Klassifizieren und speichern
              </button>
            </div>
          </form>
        </Card>

        <Card title="Letzte Einwände mit Text (90 Tage)">
          <Table head={['Zeit', 'Branche', 'Quelle', 'Kategorie', 'Text']} empty="Keine.">
            {latest.map((o) => (
              <tr key={o.id}>
                <Td className="whitespace-nowrap">{dt(o.createdAt)}</Td>
                <Td>{INDUSTRY_LABEL[o.industry ?? 'unbekannt'] ?? o.industry}</Td>
                <Td>{o.source}</Td>
                <Td>{OBJECTION_LABEL[o.category]}</Td>
                <Td className="max-w-lg text-slate-700">{o.text}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
