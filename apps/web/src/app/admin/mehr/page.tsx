import Link from 'next/link';
import { cookies } from 'next/headers';
import { PageHeader, btn } from '@/components/ui';
import { TEST_DEVICE_COOKIE } from '@/lib/request';
import { toggleTestDevice } from './actions';
import { requireAdmin } from '@/lib/auth';

export const metadata = { title: 'Mehr' };

/** Alles, was im Tagesgeschäft nicht gebraucht wird – nach Zweck sortiert, mit einem Satz Erklärung. */
const GROUPS: { title: string; links: { href: string; label: string; text: string }[] }[] = [
  {
    title: 'Kunden',
    links: [
      { href: '/admin/orders', label: 'Bestellungen', text: 'Zahlungen, Rechnungen, Erstattungen' },
      { href: '/admin/customers', label: 'Kunden & Websites', text: 'Wer gekauft hat und welche Seite live ist' },
    ],
  },
  {
    title: 'Auswertung',
    links: [
      { href: '/admin/kpis', label: 'Kennzahlen', text: 'Scans, Klicks und Käufe auf einen Blick' },
      { href: '/admin/funnel', label: 'Weg zum Kauf', text: 'Wo Betriebe aussteigen' },
      { href: '/admin/budget', label: 'Kosten', text: 'Was Briefe und KI diese Woche gekostet haben' },
      { href: '/admin/reports', label: 'Wochenberichte', text: 'Zusammenfassung jeder Woche' },
    ],
  },
  {
    title: 'Briefe verbessern',
    links: [
      { href: '/admin/variants', label: 'Brief-Versionen', text: 'Welche Brieftexte im Test sind' },
      { href: '/admin/optimizer', label: 'Automatische Auswahl', text: 'Welche Version öfter verschickt wird' },
      { href: '/admin/learning', label: 'Lern-Vorschläge', text: 'Vorschläge der KI zum Freigeben' },
      { href: '/admin/objections', label: 'Einwände', text: 'Was Betriebe zurückschreiben' },
      { href: '/admin/claims', label: 'Erlaubte Aussagen', text: 'Belegte Zahlen, die in Briefe dürfen' },
    ],
  },
  {
    title: 'System',
    links: [
      { href: '/admin/settings', label: 'Einstellungen', text: 'Absender, Preise, Budgets, Not-Aus' },
      { href: '/admin/audit', label: 'Verlauf', text: 'Wer wann was geändert hat' },
      { href: '/admin/jobs', label: 'Hintergrund-Aufträge', text: 'Was der Server gerade abarbeitet' },
    ],
  },
];

export default async function MorePage() {
  await requireAdmin();
  const isTestDevice = (await cookies()).get(TEST_DEVICE_COOKIE)?.value === '1';
  return (
    <>
      <PageHeader title="Mehr" subtitle="Alles, was du im Alltag selten brauchst." />
      <div className="more">
        {GROUPS.map((g) => (
          <section key={g.title} className="more-group">
            <h2 className="home-h2">{g.title}</h2>
            <ul>
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <strong>{l.label}</strong>
                    <span>{l.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="more-group">
          <h2 className="home-h2">Eigene Tests</h2>
          <p className="text-sm">
            {isTestDevice
              ? 'Dieses Gerät ist als Testgerät markiert: Scans, Demo-Aufrufe und Klicks von hier zählen nicht in den Kennzahlen.'
              : 'Teste Briefe und Demos auf diesem Gerät, ohne die Kennzahlen zu verfälschen: Markiere es als Testgerät.'}
          </p>
          <form action={toggleTestDevice} className="mt-2">
            <button type="submit" className={btn.secondary}>
              {isTestDevice ? 'Testgerät-Markierung entfernen' : 'Dieses Gerät als Testgerät markieren'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
