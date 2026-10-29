import { z } from 'zod';

/**
 * Was der Verwaltungs-Assistent vorschlagen darf. Alles ist umkehrbar und kostet nichts; jede Aktion wird erst nach
 * einem Klick des Betreibers ausgeführt. Briefversand, Zahlungen, Erstattungen, Domains, Freigaben und Löschungen
 * sind bewusst nicht dabei – dafür gibt es die jeweiligen Seiten mit ihren eigenen Prüfungen.
 */
export const ASSISTANT_ACTION_TYPES = [
  'lead_suche_starten',
  'lead_suche_stoppen',
  'mindestgrenze_setzen',
  'mindestgrenze_anwenden',
  'seite_oeffnen',
] as const;
export type AssistantActionType = (typeof ASSISTANT_ACTION_TYPES)[number];

export const assistantActionSchema = z.object({
  typ: z.enum(ASSISTANT_ACTION_TYPES),
  /** Lead-Suche: Städte (leer = erste Zielstadt) */
  staedte: z.array(z.string().max(80)).max(20).default([]),
  /** Lead-Suche: Branchen-Schlüssel (leer = alle aktiven) */
  branchen: z.array(z.string().max(60)).max(60).default([]),
  /** Mindest-Punkte (0–100) */
  punkte: z.number().int().min(0).max(100).nullable().default(null),
  /** Seite öffnen: Pfad unter /admin */
  ziel: z
    .string()
    .max(120)
    .regex(/^(\/admin(\/[a-z0-9-]*)*(\?[a-z0-9=&-]*)?)?$/)
    .default(''),
});
export type AssistantAction = z.infer<typeof assistantActionSchema>;

export interface AssistantReply {
  antwort: string;
  aktionen: AssistantAction[];
  /** 'ki' = Claude, 'befehle' = eingebauter Befehlsmodus ohne KI */
  modus: 'ki' | 'befehle';
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** Kompakter, PII-freier Stand der Verwaltung als Grundlage für Antworten */
export interface AssistantSnapshot {
  jetzt: string;
  modus: 'test' | 'live';
  notAus: boolean;
  zielstaedte: string[];
  branchen: { key: string; label: string; gruppe: string }[];
  mindestPunkte: number;
  leads: { status: Record<string, number>; offenAbGrenze: number; offenUnterGrenze: number; besterWert: number };
  suche: {
    laeuft: boolean;
    wartend: number;
    phase: string | null;
    text: string | null;
    prozent: number | null;
    zaehler: Record<string, number> | null;
    letzteMeldung: string | null;
  };
  offen: { demosPruefen: number; briefeFreigeben: number; support: number; warnungen: number };
  pflichtangaben: string[];
  seiten: { href: string; label: string }[];
}

/** JSON-Schema für die strukturierte KI-Antwort (strict) */
export const ASSISTANT_REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['antwort', 'aktionen'],
  properties: {
    antwort: { type: 'string', description: 'Kurze, freundliche Antwort auf Deutsch (Du-Form), höchstens 6 Sätze.' },
    aktionen: {
      type: 'array',
      description: 'Vorgeschlagene Aktionen; der Betreiber bestätigt jede per Klick. Leer, wenn nichts zu tun ist.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['typ', 'staedte', 'branchen', 'punkte', 'ziel'],
        properties: {
          typ: { type: 'string', enum: [...ASSISTANT_ACTION_TYPES] },
          staedte: { type: 'array', items: { type: 'string' } },
          branchen: { type: 'array', items: { type: 'string' }, description: 'Branchen-Schlüssel aus dem Stand' },
          punkte: { type: ['integer', 'null'] },
          ziel: { type: 'string', description: 'Nur für seite_oeffnen: href aus dem Stand, sonst leer' },
        },
      },
    },
  },
} as const;

export function describeAction(
  a: AssistantAction,
  snap: Pick<AssistantSnapshot, 'branchen' | 'seiten' | 'mindestPunkte' | 'zielstaedte'>,
): string {
  switch (a.typ) {
    case 'lead_suche_starten': {
      const cities = a.staedte.length ? a.staedte.join(', ') : (snap.zielstaedte[0] ?? 'Zielstadt');
      const labels = a.branchen.map((k) => snap.branchen.find((b) => b.key === k)?.label ?? k);
      const br = labels.length
        ? labels.length > 3
          ? `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`
          : labels.join(', ')
        : 'alle Branchen';
      return `Lead-Suche starten: ${cities} · ${br} · ab ${a.punkte ?? snap.mindestPunkte} Punkten`;
    }
    case 'lead_suche_stoppen':
      return 'Laufende Lead-Suche stoppen';
    case 'mindestgrenze_setzen':
      return `Mindestgrenze auf ${a.punkte ?? snap.mindestPunkte} Punkte setzen`;
    case 'mindestgrenze_anwenden':
      return `Offene Leads unter ${snap.mindestPunkte} Punkten aussortieren`;
    case 'seite_oeffnen':
      return `Öffnen: ${snap.seiten.find((p) => p.href === a.ziel)?.label ?? a.ziel}`;
  }
}
