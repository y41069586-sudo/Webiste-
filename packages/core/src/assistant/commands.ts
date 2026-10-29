import { foldUmlauts } from '../leads/normalize';
import type { AssistantAction, AssistantReply, AssistantSnapshot } from './actions';

/**
 * Befehlsmodus ohne KI: erkennt die häufigsten Anliegen an Schlüsselwörtern. Läuft immer (auch ohne Anthropic-
 * Schlüssel) und dient im KI-Modus als Rückfall, wenn die KI nicht erreichbar ist.
 */
export const GROUP_WORDS: Record<string, string[]> = {
  handwerk: ['handwerk', 'handwerker'],
  beauty: ['beauty', 'kosmetik', 'schoenheit'],
  gastronomie: ['gastro', 'gastronomie', 'restaurant', 'restaurants', 'essen gehen'],
  einzelhandel: ['einzelhandel', 'laden', 'laeden', 'geschaefte', 'shop'],
  kurse: ['kurse', 'training', 'fitness'],
};

export const PAGE_WORDS: [string[], string][] = [
  [['lead-suche', 'leadsuche', 'suche'], '/admin/suche'],
  [['leads', 'betriebe'], '/admin/leads'],
  [['demo', 'demos'], '/admin/demos'],
  [['brief', 'briefe'], '/admin/letters'],
  [['postausgang', 'outbox'], '/admin/outbox'],
  [['support', 'anfragen', 'nachrichten'], '/admin/support'],
  [['bestellung', 'bestellungen', 'auftraege'], '/admin/orders'],
  [['kunden', 'websites'], '/admin/customers'],
  [['kennzahlen', 'kpi', 'kpis', 'zahlen'], '/admin/kpis'],
  [['funnel', 'trichter'], '/admin/funnel'],
  [['budget', 'kosten'], '/admin/budget'],
  [['jobs', 'auftraege im hintergrund', 'hintergrund'], '/admin/jobs'],
  [['einstellungen', 'settings'], '/admin/settings'],
  [['protokoll', 'audit'], '/admin/audit'],
  [['uebersicht', 'start', 'heute', 'dashboard'], '/admin'],
];

export const FORBIDDEN: [RegExp, string][] = [
  [
    /(brief|briefe).*(send|versend|verschick|abschick|schick|raus)|(send|versend|verschick|schick).*(brief|briefe)/,
    'Briefe gibst du unter „Briefe freigeben“ selbst frei; versendet wird erst nach deiner Freigabe und nur im eingestellten Modus.',
  ],
  [
    /(zahlung|bezahl|erstatt|stripe|rechnung)/,
    'Zahlungen, Erstattungen und Rechnungen löse ich nicht aus – das läuft über „Bestellungen“ mit ihren eigenen Prüfungen.',
  ],
  [/(domain).*(kauf|registr|bestell)/, 'Domains kaufe ich nicht; das passiert erst beim Go-Live eines bezahlten Auftrags.'],
  [
    /(loesch|entfern).*(lead|kunde|daten|alle)/,
    'Löschen mache ich nicht. Leads kann ich höchstens nach der Mindestgrenze aussortieren – das ist umkehrbar.',
  ],
  [
    /(live schalt|live-modus|testmodus aus|dry.?run aus|not-aus)/,
    'Den Modus (Test/Live) und den Not-Aus schaltest du nur selbst unter System → Einstellungen.',
  ],
];

export function words(text: string): string {
  return ` ${foldUmlauts(text)
    .replace(/[^a-z0-9äöüß\s-]/g, ' ')
    .replace(/\s+/g, ' ')} `;
}

export function has(t: string, ...needles: string[]): boolean {
  return needles.some((n) => t.includes(` ${n}`) || t.includes(`${n} `));
}

export function numberIn(t: string): number | null {
  const m =
    t.match(/(?:ab|ueber|mindestens|min|grenze|auf|von)\s+(\d{1,3})\b/) ?? t.match(/\b(\d{1,3})\s*(?:punkte|punkten|score|%)/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export function statusText(s: AssistantSnapshot): string {
  if (!s.suche.laeuft) {
    const last =
      s.suche.text && s.suche.phase && ['fertig', 'gestoppt', 'fehler'].includes(s.suche.phase)
        ? ` Letzte Suche: ${s.suche.text}.`
        : '';
    return `Gerade läuft keine Lead-Suche.${last}`;
  }
  if (!s.suche.phase || ['fertig', 'gestoppt', 'fehler'].includes(s.suche.phase))
    return s.suche.wartend ? 'Die Suche ist eingereiht und wartet, bis der Server sie abholt.' : 'Die Suche startet gerade.';
  const z = s.suche.zaehler;
  const counts = z
    ? ` Bisher ${z.found ?? 0} Treffer, ${z.checked ?? 0} geprüft, ${(z.qualified ?? 0) + (z.needsReview ?? 0)} übernommen, ${z.belowMin ?? 0} unter der Grenze.`
    : '';
  return `Die Suche läuft (${s.suche.prozent ?? 0} %): ${s.suche.text ?? ''}.${counts}`;
}

export function nextSteps(s: AssistantSnapshot): string {
  const steps: string[] = [];
  if (s.offen.warnungen) steps.push(`${s.offen.warnungen} Warnung(en) in der Übersicht ansehen`);
  if (s.pflichtangaben.length)
    steps.push(`Pflichtangaben eintragen: ${s.pflichtangaben.slice(0, 3).join(', ')}${s.pflichtangaben.length > 3 ? ' …' : ''}`);
  if (s.offen.demosPruefen) steps.push(`${s.offen.demosPruefen} Demo(s) prüfen`);
  if (s.offen.briefeFreigeben) steps.push(`${s.offen.briefeFreigeben} Brief(e) freigeben`);
  if (s.offen.support) steps.push(`${s.offen.support} Support-Nachricht(en) beantworten`);
  if (!s.suche.laeuft && s.leads.offenAbGrenze < 10)
    steps.push(`Lead-Suche starten (erst ${s.leads.offenAbGrenze} offene Leads ab ${s.mindestPunkte} Punkten)`);
  return steps.length
    ? `Als Nächstes:\n${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`
    : 'Gerade ist nichts offen – alles erledigt.';
}

export const HELP =
  'Ich kann zum Beispiel: „Starte die Suche in Dortmund für Handwerk ab 70 Punkten“, „Stopp die Suche“, „Wie weit ist die Suche?“, „Wie viele Leads haben wir?“, „Setz die Grenze auf 60“, „Was sind die nächsten Schritte?“ oder „Öffne die Briefe“.';

export const action = (a: Partial<AssistantAction> & Pick<AssistantAction, 'typ'>): AssistantAction => ({
  staedte: [],
  branchen: [],
  punkte: null,
  ziel: '',
  leadId: null,
  name: '',
  ...a,
});

const reply = (antwort: string, aktionen: AssistantAction[] = [], links: AssistantReply['links'] = []): AssistantReply => ({
  antwort,
  aktionen,
  links,
  modus: 'befehle',
});

/** Gruppen und Branchen, die im Text vorkommen (Label, Schlüssel oder Gruppenwort) */
export function branchesIn(t: string, s: Pick<AssistantSnapshot, 'branchen'>): { groups: string[]; branchen: string[] } {
  const groups = Object.entries(GROUP_WORDS)
    .filter(([, ws]) => ws.some((w) => t.includes(` ${w}`)))
    .map(([g]) => g);
  const direct = s.branchen
    .filter((b) => t.includes(` ${foldUmlauts(b.label)}`) || t.includes(` ${b.key} `) || t.includes(` ${b.key}`))
    .map((b) => b.key);
  return {
    groups,
    branchen: [...new Set([...direct, ...s.branchen.filter((b) => groups.includes(b.gruppe)).map((b) => b.key)])],
  };
}

/**
 * Aktionen und Verbote: liefert eine Antwort, wenn der Text eine Aktion verlangt (Suche starten/stoppen,
 * Mindestgrenze, Seite öffnen) oder etwas Verbotenes; sonst null.
 */
export function matchAction(text: string, s: AssistantSnapshot): AssistantReply | null {
  const t = words(text);
  // Fragen nach dem Stand („Wie viele Briefe wurden verschickt?“) sind keine Aufträge; Bitten („Kannst du …“) schon
  const question =
    /^ (wie|was|wann|wo|wer|welche|welcher|warum|wieso|weshalb|gibt|haben|hat|sind|ist|wurden|wurde|darf|duerfen|muss) /.test(
      t,
    ) && !/^ (kannst|kann|koenntest|wuerdest|mach|bitte) /.test(t);
  const explain = /(was bedeut|wie berechn|wie funktion|erklaer|was sind|was ist|warum|wieso|wofuer|wie entsteh)/.test(t);
  if (!question) for (const [re, msg] of FORBIDDEN) if (re.test(t)) return reply(msg);

  const searchy = has(t, 'such', 'suche', 'lead-suche', 'leadsuche', 'finde', 'finden');
  if (searchy && has(t, 'stopp', 'stop', 'stoppe', 'abbrechen', 'brich', 'anhalten', 'beende', 'beenden'))
    return s.suche.laeuft
      ? reply('Soll ich die laufende Suche stoppen? Bereits geprüfte Betriebe bleiben gespeichert.', [
          action({ typ: 'lead_suche_stoppen' }),
        ])
      : reply('Es läuft gerade keine Suche, die ich stoppen könnte.');

  const n = numberIn(t);
  if (has(t, 'grenze', 'mindest', 'mindestgrenze', 'schwelle', 'punkte', 'score') && !searchy) {
    if (has(t, 'aussortier', 'aussortieren', 'anwenden', 'raus', 'aufraeumen'))
      return reply(
        `${s.leads.offenUnterGrenze} offene Leads liegen unter ${s.mindestPunkte} Punkten. Soll ich sie aussortieren? Nichts wird gelöscht; eine neue Suche mit niedrigerer Grenze holt sie zurück.`,
        s.leads.offenUnterGrenze ? [action({ typ: 'mindestgrenze_anwenden' })] : [],
      );
    if (n !== null && has(t, 'setz', 'setze', 'stell', 'stelle', 'aender', 'mach', 'auf'))
      return reply(`Mindestgrenze von ${s.mindestPunkte} auf ${n} Punkte ändern?`, [
        action({ typ: 'mindestgrenze_setzen', punkte: n }),
      ]);
    if (!explain && !has(t, 'wie viele', 'wieviele', 'leads', 'betriebe', 'liste', 'beste', 'top'))
      return reply(
        `Die Mindestgrenze liegt bei ${s.mindestPunkte} von 100 Punkten. ${s.leads.offenAbGrenze} offene Leads liegen darüber, ${s.leads.offenUnterGrenze} darunter (bester Wert ${s.leads.besterWert}).`,
        [],
        [{ href: '/admin/suche', label: 'Betriebe suchen' }],
      );
  }

  const { branchen } = branchesIn(t, s);
  const staedte = s.zielstaedte.filter((c) => t.includes(` ${foldUmlauts(c)}`));
  const startWord = has(t, 'starte', 'starten', 'start', 'neue', 'mehr', 'los', 'durchsuche', 'scanne');
  if (searchy && (startWord || staedte.length || branchen.length)) {
    if (s.suche.laeuft)
      return reply(`Es läuft schon eine Suche. ${statusText(s)}`, [action({ typ: 'seite_oeffnen', ziel: '/admin/suche' })]);
    return reply('Diese Suche würde ich starten – passt das?', [
      action({ typ: 'lead_suche_starten', staedte: staedte.length ? staedte : s.zielstaedte.slice(0, 1), branchen, punkte: n }),
    ]);
  }

  if (has(t, 'oeffne', 'geh', 'gehe', 'wo ist', 'bring', 'navigier')) {
    const hit = PAGE_WORDS.find(([ws]) => ws.some((w) => t.includes(` ${w}`)));
    if (hit) return reply('Hier entlang:', [action({ typ: 'seite_oeffnen', ziel: hit[1] })]);
  }
  return null;
}

/** Befehlsmodus nur aus dem Stand (ohne Datenbank): Aktionen, Status, Zählung, nächste Schritte, Hilfe */
export function runCommand(text: string, s: AssistantSnapshot): AssistantReply {
  const hit = matchAction(text, s);
  if (hit) return hit;
  const t = words(text);
  if (has(t, 'laeuft', 'status', 'fortschritt', 'wie weit', 'wie lange', 'stand', 'macht', 'passiert'))
    return reply(statusText(s), s.suche.laeuft ? [action({ typ: 'seite_oeffnen', ziel: '/admin/suche' })] : []);
  if (has(t, 'such', 'suche', 'finde', 'starte') && !s.suche.laeuft)
    return reply('Diese Suche würde ich starten – passt das?', [
      action({ typ: 'lead_suche_starten', staedte: s.zielstaedte.slice(0, 1) }),
    ]);
  if (has(t, 'such', 'suche', 'starte') && s.suche.laeuft)
    return reply(`Es läuft schon eine Suche. ${statusText(s)}`, [action({ typ: 'seite_oeffnen', ziel: '/admin/suche' })]);
  if (has(t, 'wie viele', 'wieviele', 'anzahl', 'leads')) {
    const st = s.leads.status;
    return reply(
      `Leads: ${st.discovered ?? 0} zur Prüfung, ${st.qualified ?? 0} geeignet, ${st.rejected ?? 0} aussortiert, ${st.demo_built ?? 0} mit Demo. Ab ${s.mindestPunkte} Punkten sind ${s.leads.offenAbGrenze} offen.`,
      [action({ typ: 'seite_oeffnen', ziel: '/admin/leads' })],
    );
  }
  if (has(t, 'naechst', 'naechste', 'naechsten', 'todo', 'to-do', 'aufgaben', 'was soll', 'was muss', 'schritte', 'offen'))
    return reply(nextSteps(s));
  if (has(t, 'zeig', 'zeige', 'wo finde')) {
    const hit = PAGE_WORDS.find(([ws]) => ws.some((w) => t.includes(` ${w}`)));
    if (hit) return reply('Hier entlang:', [action({ typ: 'seite_oeffnen', ziel: hit[1] })]);
  }
  if (has(t, 'hilfe', 'help', 'kannst du', 'was kannst')) return reply(HELP);
  return reply(`Das habe ich nicht verstanden. ${HELP}`);
}
