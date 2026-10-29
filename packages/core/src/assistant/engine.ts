import type { AppConfig } from '../config/settings';
import { REJECTION_LABELS, type RejectionReason } from '../leads/qualify';
import { foldUmlauts } from '../leads/normalize';
import type { AssistantAction, AssistantLink, AssistantReply, AssistantSnapshot, AssistantTurn } from './actions';
import { action, branchesIn, has, matchAction, nextSteps, statusText, words } from './commands';
import { de, type AssistantData, type CountRow, type LeadFilter, type LeadRow } from './data';
import { KNOWLEDGE, searchKnowledge } from './knowledge';
import { normalize, similar, stem, tokens } from './text';

/**
 * Assistent ohne KI: versteht Fragen über Absichten (Schlüsselwörter mit Tippfehler-Toleranz), Entitäten (Städte,
 * Branchen, Zustände, Zahlen, Zeiträume, Betriebsnamen) und Rückfragen („und in Bochum?“). Antworten kommen aus der
 * Datenbank (lesend), dem Projektwissen oder als Vorschlag einer Aktion, die der Betreiber per Klick bestätigt.
 */
export interface EngineContext {
  snap: AssistantSnapshot;
  cfg: AppConfig;
  data: AssistantData;
  /** Bisheriges Gespräch (ohne die aktuelle Nachricht) */
  history: AssistantTurn[];
}

type Intent =
  | 'overview'
  | 'next'
  | 'search_status'
  | 'leads'
  | 'lead_top'
  | 'demos'
  | 'letters'
  | 'orders'
  | 'customers'
  | 'support'
  | 'budget'
  | 'funnel'
  | 'server'
  | 'alerts'
  | 'audit'
  | 'settings'
  | 'help';

/** Schlüsselwörter je Absicht (werden gestemmt und tippfehlertolerant verglichen) */
const INTENTS: [Intent, string[]][] = [
  [
    'overview',
    [
      'überblick',
      'zusammenfassung',
      'gesamtstand',
      'lage',
      'dashboard',
      'wie stehen',
      'wie läuft es',
      'stand der dinge',
      'alles zusammen',
      'bericht',
      'report',
    ],
  ],
  [
    'next',
    [
      'nächste',
      'nächsten',
      'schritte',
      'todo',
      'to-do',
      'aufgaben',
      'was soll ich',
      'was muss ich',
      'was fehlt',
      'was steht an',
      'erledigen',
      'priorität',
    ],
  ],
  ['search_status', ['fortschritt', 'wie weit', 'wie lange noch', 'läuft die suche', 'suche läuft', 'suchstatus', 'prozent']],
  [
    'leads',
    [
      'lead',
      'leads',
      'betrieb',
      'betriebe',
      'firmen',
      'firma',
      'potenzial',
      'gefunden',
      'aussortiert',
      'abgelehnt',
      'geeignet',
      'segment',
    ],
  ],
  ['lead_top', ['beste', 'besten', 'top', 'höchste', 'stärkste', 'vielversprechend', 'ranking', 'rangliste']],
  ['demos', ['demo', 'demos', 'entwurf', 'entwürfe', 'vorschau']],
  [
    'letters',
    ['brief', 'briefe', 'post', 'versand', 'versendet', 'verschickt', 'porto', 'easynova', 'postausgang', 'zugestellt'],
  ],
  [
    'orders',
    [
      'bestellung',
      'bestellungen',
      'umsatz',
      'verkauf',
      'verkauft',
      'verdient',
      'einnahmen',
      'bezahlt',
      'zahlungen',
      'gekauft',
      'käufe',
      'auftrag',
      'aufträge',
      'abo',
      'abos',
    ],
  ],
  ['customers', ['kunde', 'kunden', 'kundenseiten', 'websites live', 'seiten live', 'live seiten', 'onboarding']],
  [
    'support',
    [
      'support',
      'anfrage',
      'anfragen',
      'nachricht',
      'nachrichten',
      'mail',
      'mails',
      'email',
      'e-mail',
      'postfach',
      'posteingang',
      'beschwerde',
    ],
  ],
  ['budget', ['budget', 'kosten', 'ausgaben', 'ausgegeben', 'geld', 'teuer', 'verbraucht', 'ledger']],
  [
    'funnel',
    [
      'scan',
      'scans',
      'gescannt',
      'aufruf',
      'aufrufe',
      'klick',
      'klicks',
      'funnel',
      'conversion',
      'kennzahl',
      'kennzahlen',
      'kpi',
      'kpis',
      'quote',
      'rate',
      'statistik',
      'zahlen',
    ],
  ],
  [
    'server',
    [
      'server',
      'worker',
      'job',
      'jobs',
      'hintergrund',
      'erreichbar',
      'online',
      'gesundheit',
      'health',
      'contabo',
      'warteschlange',
    ],
  ],
  ['alerts', ['warnung', 'warnungen', 'fehler', 'problem', 'probleme', 'alarm', 'alert', 'alerts', 'kaputt']],
  [
    'audit',
    ['protokoll', 'verlauf', 'passiert', 'aktivität', 'letzte aktionen', 'wer hat', 'audit', 'historie', 'geändert', 'zuletzt'],
  ],
  ['settings', ['einstellung', 'einstellungen', 'konfiguration', 'eingestellt', 'modus', 'schalter', 'automatik', 'testmodus']],
  ['help', ['hilfe', 'help', 'was kannst', 'kannst du', 'befehle', 'funktionen']],
];

/** Starke Erklärfragen: Wissen vor Daten */
const EXPLAIN_STRONG = [
  'warum',
  'wieso',
  'weshalb',
  'wie funktioniert',
  'wie funktionieren',
  'wie funktionert',
  'wie mache',
  'wie geht',
  'wie kann ich',
  'wie richte',
  'wie update',
  'wie aktualisiere',
  'wie stelle',
  'wo stelle',
  'wo trage',
  'wo ändere',
  'erklär',
  'erkläre',
  'was bedeutet',
  'was bedeuten',
  'was heißt',
  'wofür',
  'wozu',
  'muss ich',
  'darf ich',
  'dürfen wir',
  'was muss ich vor',
];
/** Schwache Erklärfragen: Wissen, wenn kein deutliches Datenthema erkannt wird */
const EXPLAIN_WEAK = ['was ist', 'was sind', 'was passiert', 'was kostet', 'wann', 'wie läuft', 'wie lange dauert'];
const DATA = [
  'wie viele',
  'wieviele',
  'wie viel',
  'wieviel',
  'wie hoch',
  'anzahl',
  'zeig',
  'zeige',
  'liste',
  'welche',
  'aktuell',
  'gerade',
  'heute',
  'diese woche',
  'bisher',
  'insgesamt',
  'summe',
  'gibt es',
  'zuletzt',
  'neueste',
  'haben wir',
];
const GREETING = /^(hi|hallo|hey|moin|servus|huhu|guten (morgen|tag|abend)|na|yo)\b/;

const STATUS_WORDS: [string[], string[]][] = [
  [['zur prüfung', 'zu prüfen', 'offen', 'offene', 'neu gefunden', 'gefunden'], ['discovered']],
  [['geeignet', 'qualifiziert'], ['qualified']],
  [['aussortiert', 'abgelehnt', 'rejected'], ['rejected']],
  [['gesperrt', 'widerspruch'], ['suppressed']],
  [
    ['mit demo', 'demo gebaut'],
    ['demo_built', 'demo_approved', 'demo_published'],
  ],
  [
    ['angeschrieben', 'brief verschickt', 'kontaktiert'],
    ['letter_sent', 'letter_delivered', 'followup_sent'],
  ],
  [['gescannt'], ['scanned']],
  [
    ['gekauft', 'bezahlt', 'kunden'],
    ['paid', 'onboarding', 'preview_approved', 'live'],
  ],
];

const OPEN = ['discovered', 'qualified'];
const eur = (cents: number) =>
  `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const when = (isoStr: string | null) =>
  isoStr
    ? new Date(isoStr).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
      })
    : '–';
const list = (rows: CountRow[], label = de) => rows.map((r) => `${label(r.key)} ${r.n}`).join(' · ') || 'keine';
const sum = (rows: CountRow[]) => rows.reduce((s, r) => s + r.n, 0);

const reply = (antwort: string, aktionen: AssistantAction[] = [], links: AssistantLink[] = []): AssistantReply => ({
  antwort,
  aktionen,
  links,
  modus: 'befehle',
});

interface Entities {
  cities: string[];
  branches: string[];
  groups: string[];
  statuses: string[];
  days: number | null;
  minScore: number | null;
  name: string | null;
}

function scoreIntents(text: string): { intent: Intent; score: number }[] {
  const n = normalize(text);
  const q = tokens(text, true);
  return INTENTS.map(([intent, keys]) => {
    let score = 0;
    // Jedes Wort der Frage zählt höchstens einmal (sonst zählen „kunde“ und „kunden“ doppelt)
    const hit = new Set<number>();
    for (const k of keys) {
      const kn = normalize(k);
      if (kn.includes(' ')) {
        if (` ${n} `.includes(` ${kn}`)) score += 2;
      } else q.forEach((w, i) => similar(w, stem(kn)) && hit.add(i));
    }
    return { intent, score: score + hit.size };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function phraseIn(n: string, phrases: string[]): boolean {
  return phrases.some((p) => ` ${n} `.includes(` ${normalize(p)}`));
}

async function entities(text: string, ctx: EngineContext): Promise<Entities> {
  const t = words(text);
  const n = normalize(text);
  const known = [...new Set([...ctx.cfg.targeting.cities, ...(await ctx.data.knownCities())])];
  const q = tokens(text, true);
  const cities = known.filter((c) => {
    const cn = normalize(c);
    return (
      ` ${n} `.includes(` ${cn} `) ||
      (cn.length >= 5 && !cn.includes(' ') && q.some((w) => similar(w, stem(cn)) && w.length >= 5))
    );
  });
  const { groups, branchen } = branchesIn(t, ctx.snap);
  const statuses = STATUS_WORDS.filter(([ws]) => phraseIn(n, ws)).flatMap(([, s]) => s);
  const dm = n.match(/(?:letzte[nrm]?|vergangene[nrm]?|seit)\s+(\d{1,3})\s+tag/);
  const days = dm
    ? Number(dm[1])
    : /\bheute\b/.test(n)
      ? 1
      : /\bwoche\b/.test(n)
        ? 7
        : /\bmonat\b/.test(n)
          ? 30
          : /\bjahr\b/.test(n)
            ? 365
            : null;
  const sm = n.match(/(?:ab|ueber|mindestens|mehr als)\s+(\d{1,3})\s*(?:punkte|punkten|score)?/);
  const minScore = sm && Number(sm[1]) <= 100 ? Number(sm[1]) : null;
  const quoted = text.match(/[„"“'‚]([^„"“”'‘’]{3,80})[“"”'‘’]/);
  return { cities, branches: branchen, groups, statuses, days, minScore, name: quoted ? quoted[1]!.trim() : null };
}

function leadLine(l: LeadRow): string {
  const why =
    l.status === 'rejected' && l.reasons?.length
      ? ` – ${l.reasons.map((r) => REJECTION_LABELS[r as RejectionReason] ?? r).join(', ')}`
      : '';
  return `• ${l.name} (${l.city}) – ${de(l.status)}, ${l.prescreen} Punkte${why}`;
}

function filterText(f: LeadFilter, e: Entities): string {
  const parts = [
    e.cities.length ? `in ${e.cities.join(', ')}` : '',
    e.groups.length ? e.groups.join('/') : e.branches.length ? `${e.branches.length} Branche(n)` : '',
    f.minScore !== undefined ? `ab ${f.minScore} Punkten` : '',
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/** Datenantwort für eine Absicht */
async function answerIntent(intent: Intent, e: Entities, text: string, ctx: EngineContext): Promise<AssistantReply> {
  const { snap, cfg, data } = ctx;
  const f: LeadFilter = {
    cities: e.cities,
    branches: e.branches.length ? e.branches : undefined,
    statuses: e.statuses.length ? e.statuses : undefined,
    minScore: e.minScore ?? undefined,
  };
  switch (intent) {
    case 'overview': {
      const [orders, sites, week] = await Promise.all([data.orderStats(), data.siteCounts(), data.letterWeek()]);
      const st = snap.leads.status;
      const lines = [
        `Modus: ${snap.modus === 'test' ? 'Testmodus' : 'LIVE'}${snap.notAus ? ' · NOT-AUS aktiv' : ''}`,
        `Leads: ${(st.discovered ?? 0) + (st.qualified ?? 0)} offen (${snap.leads.offenAbGrenze} ab ${snap.mindestPunkte} Punkten), ${st.rejected ?? 0} aussortiert`,
        `Suche: ${snap.suche.laeuft ? `läuft (${snap.suche.prozent ?? 0} %)` : 'ruht'}`,
        `Zu tun: ${snap.offen.demosPruefen} Demos prüfen, ${snap.offen.briefeFreigeben} Briefe freigeben, ${snap.offen.support} Support, ${snap.offen.warnungen} Warnungen`,
        `Briefe diese Woche: ${week.sent} echt, ${week.tests} Test`,
        `Bezahlt: ${sum(orders.byPlan)} Bestellungen (${eur(orders.paidCents)}), Websites live: ${sites.find((s) => s.key === 'live')?.n ?? 0}`,
      ];
      return reply(`Überblick:\n${lines.map((l) => `• ${l}`).join('\n')}`, [], [{ href: '/admin', label: 'Übersicht' }]);
    }
    case 'next':
      return reply(nextSteps(snap), [], [{ href: '/admin', label: 'Übersicht' }]);
    case 'search_status':
      return reply(statusText(snap), [], [{ href: '/admin/suche', label: 'Lead-Suche' }]);
    case 'leads':
    case 'lead_top': {
      const wantsList = intent === 'lead_top' || has(words(text), 'zeig', 'zeige', 'liste', 'welche', 'nenn');
      if (wantsList) {
        const top = await data.topLeads({ ...f, statuses: f.statuses ?? OPEN }, 8);
        return reply(
          top.length
            ? `${f.statuses ? `Leads (${[...new Set(f.statuses.map(de))].join(', ')})` : 'Die besten Leads'}${filterText(f, e)}:\n${top.map(leadLine).join('\n')}`
            : `Keine passenden Leads${filterText(f, e)} gefunden.`,
          [],
          [
            { href: '/admin/leads', label: 'Alle Leads' },
            ...top.slice(0, 3).map((l) => ({ href: `/admin/leads/${l.id}`, label: l.name })),
          ],
        );
      }
      const by = phraseIn(normalize(text), ['pro stadt', 'nach stadt', 'je stadt', 'städte', 'staedte', 'welche stadt'])
        ? 'city'
        : phraseIn(normalize(text), ['pro branche', 'nach branche', 'je branche', 'branchen'])
          ? 'branch'
          : phraseIn(normalize(text), ['segment', 'segmente'])
            ? 'segment'
            : 'status';
      const rows = await data.leadCounts(f, by);
      const label =
        by === 'branch'
          ? (k: string) => snap.branchen.find((b) => b.key === k)?.label ?? k
          : by === 'status'
            ? de
            : (k: string) => k;
      return reply(
        `Leads${filterText(f, e)}: ${sum(rows)} insgesamt\n${rows
          .slice(0, 12)
          .map((r) => `• ${label(r.key)}: ${r.n}`)
          .join(
            '\n',
          )}${by === 'status' && !e.minScore ? `\nAb ${snap.mindestPunkte} Punkten offen: ${snap.leads.offenAbGrenze} (bester Wert ${snap.leads.besterWert}).` : ''}`,
        [],
        [{ href: '/admin/leads', label: 'Leads' }],
      );
    }
    case 'demos': {
      const [counts, pending] = await Promise.all([data.demoCounts(), data.pendingDemos(5)]);
      const pend = pending.length ? `\nZur Prüfung:\n${pending.map((d) => `• ${d.name} (${d.city})`).join('\n')}` : '';
      return reply(
        `Demos: ${list(counts)}. Die ersten ${cfg.review.manualReviewFirstN} prüfst du einzeln.${pend}`,
        [],
        [{ href: '/admin/demos', label: 'Demos prüfen' }],
      );
    }
    case 'letters': {
      const [counts, week] = await Promise.all([data.letterCounts(), data.letterWeek()]);
      return reply(
        `Briefe: ${list(counts)}.\nDiese Woche: ${week.sent} echt versendet (${eur(week.costCents)}), ${week.tests} Test/Probelauf. Wochenbudget: ${eur(cfg.budget.weeklyBudgetCents)}.${snap.offen.briefeFreigeben ? `\n${snap.offen.briefeFreigeben} warten auf deine Freigabe.` : ''}`,
        [],
        [
          { href: '/admin/letters', label: 'Briefe freigeben' },
          { href: '/admin/outbox', label: 'Postausgang' },
        ],
      );
    }
    case 'orders': {
      const o = await data.orderStats();
      const plan = (k: string) =>
        ({ basis: 'Basis', care_plus: 'Care+', one_time: 'Einmalzahlung', monthly: 'Monatlich' })[k] ?? k;
      const last = o.last.length
        ? `\nZuletzt:\n${o.last.map((x) => `• ${when(x.at)} – ${plan(x.plan)}, ${eur(x.amountCents)}, ${de(x.status)}`).join('\n')}`
        : '';
      return reply(
        `Bestellungen: ${list(o.byStatus)}.\nBezahlt insgesamt: ${eur(o.paidCents)} (${o.paid30} in den letzten 30 Tagen). Tarife: ${list(o.byPlan, plan)}.${last}`,
        [],
        [{ href: '/admin/orders', label: 'Bestellungen' }],
      );
    }
    case 'customers': {
      const sites = await data.siteCounts();
      return reply(
        `Kunden-Websites: ${sum(sites)} insgesamt – ${list(sites)}.`,
        [],
        [{ href: '/admin/customers', label: 'Kunden & Websites' }],
      );
    }
    case 'support': {
      const s = await data.supportStats();
      const cls = (k: string) =>
        ({
          frage: 'Frage',
          aenderungswunsch: 'Änderungswunsch',
          beschwerde: 'Beschwerde',
          opt_out: 'Widerspruch',
          rechnung: 'Rechnung',
          spam: 'Spam',
        })[k] ?? k;
      const recent = s.recent.length
        ? `\nNeueste:\n${s.recent.map((r) => `• ${when(r.at)} – ${r.subject} (${r.cls ? cls(r.cls) : 'ungeordnet'}, ${de(r.status)})`).join('\n')}`
        : '';
      return reply(
        `Support: ${s.open} offen${s.byClass.length ? ` (${list(s.byClass, cls)})` : ''}.${recent}`,
        [],
        [{ href: '/admin/support', label: 'Support' }],
      );
    }
    case 'budget': {
      const rows = await data.budgetWeek();
      const cat = (k: string) =>
        ({ letter: 'Briefe', llm: 'KI', places_api: 'Google', domain: 'Domains', hosting: 'Hosting', other: 'Sonstiges' })[k] ??
        k;
      return reply(
        `Ausgaben diese Woche: ${eur(sum(rows))}${rows.length ? ` – ${rows.map((r) => `${cat(r.key)} ${eur(r.n)}`).join(', ')}` : ''}.\nLimits: Briefe ${eur(cfg.budget.weeklyBudgetCents)}, KI ${eur(cfg.budget.weeklyLlmBudgetCents)}, Google ${eur(cfg.budget.weeklyPlacesBudgetCents)}.`,
        [],
        [{ href: '/admin/budget', label: 'Budget' }],
      );
    }
    case 'funnel': {
      const days = e.days ?? 30;
      const rows = await data.funnel(days);
      const ev = (k: string) =>
        ({
          scan: 'Scans',
          demo_view: 'Demo-Aufrufe',
          cta_click: 'Kauf-Klicks',
          checkout_started: 'Checkouts',
          paid: 'Zahlungen',
          opt_out: 'Widersprüche',
          whatsapp_click: 'WhatsApp-Klicks',
          question_sent: 'Fragen',
        })[k] ?? k;
      const g = (k: string) => rows.find((r) => r.key === k)?.n ?? 0;
      const sent = sum((await data.letterCounts()).filter((r) => ['sent', 'delivered'].includes(r.key)));
      return reply(
        `Letzte ${days} Tage: ${rows.length ? rows.map((r) => `${ev(r.key)} ${r.n}`).join(' · ') : 'noch keine Ereignisse'}.${sent ? `\nScan-Quote bezogen auf ${sent} versendete Briefe: ${Math.round((g('scan') / sent) * 1000) / 10} %.` : ''}`,
        [],
        [
          { href: '/admin/funnel', label: 'Funnel' },
          { href: '/admin/kpis', label: 'Kennzahlen' },
        ],
      );
    }
    case 'server': {
      const [seen, jobs] = await Promise.all([data.workerSeenAt(), data.jobs()]);
      const ageMin = seen ? Math.round((Date.parse(snap.jetzt) - Date.parse(seen)) / 60000) : null;
      const failed = jobs.filter((j) => j.state === 'failed');
      const active = jobs.filter((j) => j.state === 'active');
      const health =
        ageMin === null
          ? 'Der Server hat sich in den letzten zwei Tagen nicht gemeldet.'
          : ageMin <= 15
            ? `Der Server läuft (letzte Meldung vor ${ageMin} Min.).`
            : `Achtung: letzte Meldung vor ${ageMin} Min. – in Termius prüfen.`;
      return reply(
        `${health}\nLäuft gerade: ${active.map((j) => j.name).join(', ') || 'nichts'}.\nFehlgeschlagen (48 h): ${failed.length ? failed.map((j) => `${j.name} ×${j.n}`).join(', ') : 'keine'}.`,
        [],
        [{ href: '/admin/jobs', label: 'Jobs' }],
      );
    }
    case 'alerts': {
      const al = await data.alerts(6);
      return reply(
        al.length
          ? `${snap.offen.warnungen} offene Warnung(en):\n${al.map((a) => `• ${when(a.at)} – ${a.message}`).join('\n')}`
          : 'Keine offenen Warnungen.',
        al.length ? [action({ typ: 'warnungen_erledigen' })] : [],
        [{ href: '/admin', label: 'Übersicht' }],
      );
    }
    case 'audit': {
      const a = await data.audit(8);
      return reply(
        a.length
          ? `Zuletzt passiert:\n${a.map((x) => `• ${when(x.at)} – ${x.entity}: ${x.action} (${x.actor.split(':')[0]})`).join('\n')}`
          : 'Noch nichts im Protokoll.',
        [],
        [{ href: '/admin/audit', label: 'Protokoll' }],
      );
    }
    case 'settings': {
      const sw = cfg.switches;
      return reply(
        `Einstellungen: ${snap.modus === 'test' ? 'Testmodus' : 'LIVE'}, Not-Aus ${snap.notAus ? 'an' : 'aus'}. Automatik: Versand ${sw.autoSend ? 'an' : 'aus'}, Demo-Freigabe ${sw.autoApproveDemos ? 'an' : 'aus'}, Folgebriefe ${sw.followupEnabled ? 'an' : 'aus'}, Antworten ${sw.autoReply ? 'an' : 'aus'}. Zielstädte: ${cfg.targeting.cities.join(', ')}. Mindestgrenze: ${cfg.filters.minLeadScore} Punkte.${snap.pflichtangaben.length ? `\nNoch offen: ${snap.pflichtangaben.join(', ')}.` : ''}`,
        [],
        [{ href: '/admin/settings', label: 'Einstellungen' }],
      );
    }
    case 'help':
      return reply(KNOWLEDGE.find((k) => k.id === 'assistent')!.text(cfg), [], []);
  }
}

/** Betriebsname aus Formulierungen wie „Lead Malerbetrieb Müller“, „Betrieb X“, „zu X“ */
function nameCandidate(text: string, e: Entities): string | null {
  if (e.name) return e.name;
  const m = text.match(
    /(?:lead|betrieb|firma|kunde|über|ueber|zu|von|infos? zu|details zu)\s+([A-ZÄÖÜ0-9][\wÄÖÜäöüß&.'-]*(?:\s+[A-ZÄÖÜ0-9&][\wÄÖÜäöüß&.'-]*){0,4})/,
  );
  return m ? m[1]!.trim() : null;
}

async function leadAnswer(rows: LeadRow[], verb: 'aussortieren' | 'zurueckholen' | null): Promise<AssistantReply> {
  if (rows.length === 1) {
    const l = rows[0]!;
    const acts: AssistantAction[] = [];
    if (verb === 'aussortieren' && OPEN.includes(l.status))
      acts.push(action({ typ: 'lead_aussortieren', leadId: l.id, name: l.name }));
    if (verb === 'zurueckholen' && l.status === 'rejected')
      acts.push(action({ typ: 'lead_zurueckholen', leadId: l.id, name: l.name }));
    const note =
      verb === 'aussortieren' && !OPEN.includes(l.status)
        ? '\nAussortieren geht nur bei offenen Leads (zur Prüfung/geeignet).'
        : verb === 'zurueckholen' && l.status !== 'rejected'
          ? '\nDer Lead ist nicht aussortiert.'
          : '';
    return reply(`${leadLine(l).slice(2)}${l.segment ? ` · Segment ${l.segment}` : ''}${note}`, acts, [
      { href: `/admin/leads/${l.id}`, label: `${l.name} öffnen` },
    ]);
  }
  return reply(
    `Ich habe ${rows.length} passende Betriebe gefunden:\n${rows.map(leadLine).join('\n')}\nWelchen meinst du? Schreib den Namen genauer (gern in Anführungszeichen).`,
    [],
    rows.slice(0, 4).map((l) => ({ href: `/admin/leads/${l.id}`, label: l.name })),
  );
}

export function cityChange(text: string, cfg: AppConfig): AssistantReply | null {
  const n = foldUmlauts(text);
  if (!/(zielstadt|zielstaedte|stadt|staedte)/.test(n)) return null;
  const add =
    text.match(
      /(?:füge|fuege|nimm|ergänze|ergaenze|setze?)\s+(.+?)\s+(?:als\s+(?:neue\s+)?zielstadt\s+)?(?:zu den zielstädten\s+|zu den zielstaedten\s+)?(?:hinzu|dazu|auf|mit auf)\b/i,
    ) ?? text.match(/neue\s+zielstadt[:\s]+(.+)$/i);
  const remove = text.match(
    /(?:entferne|lösche|loesche|nimm|streiche)\s+(.+?)\s+(?:aus\s+den\s+zielst(?:ä|ae)dten\s+)?(?:raus|weg|heraus|aus\b|$)/i,
  );
  const clean = (s: string) =>
    s
      .replace(/\b(die|der|stadt|zielstadt|bitte)\b/gi, '')
      .split(/\s*,\s*|\s+und\s+/)
      .map((x) => x.trim())
      .filter((x) => /^[A-ZÄÖÜ][a-zäöüß]+(?:[ -][A-ZÄÖÜ]?[a-zäöüß]+)*$/.test(x));
  if (remove && /(entferne|streiche|raus|weg|heraus)/i.test(text)) {
    const cities = clean(remove[1]!).filter((c) => cfg.targeting.cities.some((k) => normalize(k) === normalize(c)));
    if (cities.length)
      return reply(`Aus den Zielstädten entfernen: ${cities.join(', ')}?`, [
        action({ typ: 'zielstadt_entfernen', staedte: cities }),
      ]);
  }
  if (add) {
    const cities = clean(add[1]!).filter((c) => !cfg.targeting.cities.some((k) => normalize(k) === normalize(c)));
    if (cities.length)
      return reply(`Als Zielstadt hinzufügen: ${cities.join(', ')}? Danach kannst du dort suchen.`, [
        action({ typ: 'zielstadt_hinzufuegen', staedte: cities }),
      ]);
  }
  return null;
}

function lastIntent(history: AssistantTurn[]): Intent | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]!;
    if (h.role !== 'user') continue;
    const top = scoreIntents(h.text)[0];
    if (top) return top.intent;
  }
  return null;
}

function knowledgeReply(hits: ReturnType<typeof searchKnowledge>, cfg: AppConfig): AssistantReply {
  const [best, ...rest] = hits;
  const more = rest.filter((r) => r.score >= best!.score * 0.6).slice(0, 2);
  return reply(
    `${best!.entry.text(cfg)}${more.length ? `\n\nPasst vielleicht auch: ${more.map((m) => `„${m.entry.title}“`).join(', ')}` : ''}`,
    [],
    best!.entry.links ?? [],
  );
}

export async function answerOffline(text: string, ctx: EngineContext): Promise<AssistantReply> {
  const { snap, cfg, data } = ctx;
  const n = normalize(text);
  const t = words(text);

  if (GREETING.test(n) && tokens(text).length <= 3)
    return reply(
      `Hi! Kurzer Stand: ${snap.leads.offenAbGrenze} offene Leads ab ${snap.mindestPunkte} Punkten, ${snap.offen.demosPruefen} Demos und ${snap.offen.briefeFreigeben} Briefe warten, ${snap.offen.support} Support-Nachrichten, ${snap.offen.warnungen} Warnungen. Was soll ich tun?`,
      [],
      [{ href: '/admin', label: 'Übersicht' }],
    );

  // 1) Aktionen und Verbote
  const act = matchAction(text, snap);
  if (act) return act;
  const city = cityChange(text, cfg);
  if (city) return city;
  if (
    has(t, 'warnung', 'warnungen', 'alerts', 'meldungen') &&
    has(t, 'erledig', 'erledigt', 'quittier', 'ausblend', 'wegklick', 'abhaken', 'loeschen')
  )
    return snap.offen.warnungen
      ? reply(`${snap.offen.warnungen} offene Warnung(en) als erledigt markieren?`, [action({ typ: 'warnungen_erledigen' })])
      : reply('Es gibt keine offenen Warnungen.');

  const e = await entities(text, ctx);

  // 2) Einzelner Lead (aussortieren/zurückholen/Details)
  const verb =
    has(t, 'aussortier', 'aussortieren', 'ablehnen', 'rauswerfen') || /\b(sortier|sortiere|wirf|werf)\b.*\b(aus|raus)\b/.test(n)
      ? 'aussortieren'
      : has(t, 'zurueckhol', 'zurueckholen', 'wiederherstell', 'reaktivier') || /\b(hol|hole|nimm)\b.*\bzurueck\b/.test(n)
        ? 'zurueckholen'
        : null;
  const cand = nameCandidate(text, e);
  if (cand && (verb || e.name || has(t, 'lead', 'betrieb', 'firma', 'details', 'infos', 'info', 'mit'))) {
    const rows = await data.findLeadsByName(cand, 6);
    if (rows.length) return leadAnswer(rows, verb);
    if (verb) return reply(`Ich finde keinen Betrieb namens „${cand}“.`, [], [{ href: '/admin/leads', label: 'Leads' }]);
  }

  // 3) Absicht bestimmen (Daten vs. Erklärung), Rückfragen über die letzte Absicht
  const strong = phraseIn(n, EXPLAIN_STRONG);
  const weak = phraseIn(n, EXPLAIN_WEAK);
  const dataQ = phraseIn(n, DATA);
  const intents = scoreIntents(text);
  const kb = searchKnowledge(text, cfg, 3);
  const kbScore = kb[0]?.score ?? 0;
  let intent = intents[0]?.intent ?? null;
  const intentScore = intents[0]?.score ?? 0;
  // „läuft/status“ ohne anderes Thema: Stand der Suche bzw. Überblick
  if (!intent && has(t, 'laeuft', 'status', 'stand', 'passiert', 'macht'))
    intent = snap.suche.laeuft || has(t, 'such', 'suche') ? 'search_status' : 'overview';
  if (intent === 'leads' && intents.some((i) => i.intent === 'lead_top')) intent = 'lead_top';
  if (intent === 'leads' && has(t, 'such', 'suche') && has(t, 'laeuft', 'weit', 'fortschritt')) intent = 'search_status';

  if (strong && kbScore > 0 && !(dataQ && intent)) return knowledgeReply(kb, cfg);
  if (weak && kbScore > 0 && !dataQ && intentScore < 2) return knowledgeReply(kb, cfg);
  if (intent && (intent !== 'help' || kbScore === 0)) return answerIntent(intent, e, text, ctx);
  // Kurzer Name ohne Fragewort: zuerst als Betrieb versuchen
  const plainShort = text.replace(/[?!.]/g, '').trim();
  if (!strong && !weak && plainShort.split(/\s+/).length <= 3 && plainShort.length >= 4) {
    const rows = await data.findLeadsByName(plainShort, 6);
    if (rows.length) return leadAnswer(rows, null);
  }
  if (kbScore >= 1.5) return knowledgeReply(kb, cfg);

  // Rückfrage („und in Bochum?“, „und Beauty?“): letzte Absicht mit neuen Angaben
  const prev = lastIntent(ctx.history);
  if (
    prev &&
    (e.cities.length || e.branches.length || e.statuses.length || e.days || e.minScore !== null) &&
    tokens(text).length <= 6
  )
    return answerIntent(prev, e, text, ctx);

  // 4) Vielleicht ein Betriebsname
  const plain = text.replace(/[?!.]/g, '').trim();
  if (plain.length >= 4 && plain.split(/\s+/).length <= 6) {
    const rows = await data.findLeadsByName(plain, 6);
    if (rows.length) return leadAnswer(rows, null);
  }
  if (kbScore > 0) return knowledgeReply(kb, cfg);

  // 5) Nicht verstanden: Vorschläge
  return reply(
    'Das habe ich noch nicht verstanden. Frag mich zum Beispiel: „Wie viele Leads in Bochum?“, „Zeig die besten Leads ab 50 Punkten“, „Wie viel Umsatz?“, „Läuft der Server?“, „Was kostet die Website?“, „Wie funktioniert der Versand?“, „Starte die Suche für Handwerk“ oder „Was sind die nächsten Schritte?“',
  );
}
