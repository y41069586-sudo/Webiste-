import type { AssistantSnapshot } from '../src/assistant/actions';
import type { AssistantData, LeadRow } from '../src/assistant/data';

export const snapFixture = (over: Partial<AssistantSnapshot> = {}): AssistantSnapshot => ({
  jetzt: '2026-10-29T06:00:00Z',
  modus: 'test',
  notAus: false,
  zielstaedte: ['Dortmund'],
  branchen: [
    { key: 'maler', label: 'Malerbetrieb', gruppe: 'handwerk' },
    { key: 'elektriker', label: 'Elektriker', gruppe: 'handwerk' },
    { key: 'friseur', label: 'Friseursalon', gruppe: 'beauty' },
  ],
  mindestPunkte: 70,
  leads: { status: { discovered: 150, qualified: 3, rejected: 203 }, offenAbGrenze: 0, offenUnterGrenze: 153, besterWert: 66 },
  suche: {
    laeuft: false,
    wartend: 0,
    phase: 'fertig',
    text: 'Fertig: 18 Treffer',
    prozent: 100,
    zaehler: null,
    letzteMeldung: null,
  },
  offen: { demosPruefen: 0, briefeFreigeben: 0, support: 4, warnungen: 2 },
  pflichtangaben: ['Absender: Name'],
  seiten: [
    { href: '/admin', label: 'Heute → Übersicht' },
    { href: '/admin/suche', label: 'Akquise → Lead-Suche' },
    { href: '/admin/leads', label: 'Akquise → Leads' },
  ],
  ...over,
});

const L = (id: number, name: string, city: string, status: string, prescreen: number): LeadRow => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  name,
  city,
  branch: 'maler',
  status,
  prescreen,
  score: 15,
  reasons: status === 'rejected' ? ['has_website'] : [],
  segment: 'etabliert',
});
export const LEADS = [
  L(1, 'Malerbetrieb Schulz', 'Dortmund', 'discovered', 66),
  L(2, 'Elektro Krause', 'Bochum', 'discovered', 52),
  L(3, 'Salon Haarmonie', 'Bochum', 'rejected', 0),
  L(4, 'Malerbetrieb Yilmaz', 'Witten', 'qualified', 41),
];

export function stubData(calls: string[] = []): AssistantData {
  const log = (n: string) => calls.push(n);
  const match = (l: LeadRow, f: { cities?: string[]; statuses?: string[]; minScore?: number }) =>
    (!f.cities?.length || f.cities.map((c) => c.toLowerCase()).includes(l.city.toLowerCase())) &&
    (!f.statuses?.length || f.statuses.includes(l.status)) &&
    (f.minScore === undefined || l.prescreen >= f.minScore);
  return {
    async leadCounts(f, by) {
      log(`leadCounts:${by}:${JSON.stringify(f.cities ?? [])}`);
      const m = new Map<string, number>();
      for (const l of LEADS.filter((x) => match(x, f))) {
        const k = by === 'city' ? l.city : by === 'status' ? l.status : by === 'branch' ? l.branch : (l.segment ?? '–');
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m].map(([key, n]) => ({ key, n }));
    },
    async topLeads(f, limit) {
      log(`topLeads:${f.minScore ?? ''}`);
      return LEADS.filter((x) => match(x, f))
        .sort((a, b) => b.prescreen - a.prescreen)
        .slice(0, limit);
    },
    async findLeadsByName(q) {
      log(`find:${q}`);
      const words = q
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      return words.length ? LEADS.filter((l) => words.every((w) => l.name.toLowerCase().includes(w))) : [];
    },
    async knownCities() {
      return ['Dortmund', 'Bochum', 'Witten', 'Essen'];
    },
    async demoCounts() {
      log('demos');
      return [{ key: 'pending_review', n: 2 }];
    },
    async pendingDemos() {
      return [{ id: 'd1', name: 'Malerbetrieb Schulz', city: 'Dortmund', since: '2026-10-28T10:00:00Z' }];
    },
    async letterCounts() {
      log('letters');
      return [{ key: 'generated', n: 1 }];
    },
    async letterWeek() {
      return { sent: 0, costCents: 0, tests: 1 };
    },
    async orderStats() {
      log('orders');
      return { byStatus: [{ key: 'paid', n: 1 }], byPlan: [{ key: 'basis', n: 1 }], paidCents: 59700, paid30: 1, last: [] };
    },
    async siteCounts() {
      log('sites');
      return [{ key: 'live', n: 1 }];
    },
    async supportStats() {
      log('support');
      return {
        open: 4,
        byClass: [{ key: 'spam', n: 4 }],
        byStatus: [],
        recent: [{ subject: 'eRecht24 Newsletter', cls: 'spam', status: 'new', at: '2026-10-28T10:00:00Z' }],
      };
    },
    async budgetWeek() {
      log('budget');
      return [{ key: 'llm', n: 120 }];
    },
    async funnel() {
      log('funnel');
      return [{ key: 'scan', n: 3 }];
    },
    async jobs() {
      log('jobs');
      return [{ name: 'find-leads', state: 'failed', at: '2026-10-29T05:00:00Z', n: 1 }];
    },
    async workerSeenAt() {
      return '2026-10-29T05:55:00Z';
    },
    async alerts() {
      log('alerts');
      return [{ id: 'a1', level: 'warn', message: 'Noch kein geprüftes Backup', at: '2026-10-29T05:00:00Z' }];
    },
    async audit() {
      log('audit');
      return [{ action: 'enqueue', entity: 'job', actor: 'admin:x', at: '2026-10-29T05:27:00Z' }];
    },
  };
}
