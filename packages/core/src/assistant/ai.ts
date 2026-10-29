import { getConfig } from '../config/service';
import { llmStructured } from '../services/llm';
import { searchKnowledge } from './knowledge';
import {
  assistantActionSchema,
  ASSISTANT_REPLY_SCHEMA,
  type AssistantReply,
  type AssistantSnapshot,
  type AssistantTurn,
} from './actions';

const SYSTEM = `Du bist der Assistent in der Verwaltung von SeitenWerk, einem Ein-Personen-Unternehmen, das lokalen Betrieben ohne Website per Brief eine fertige Demo-Website zeigt. Du sprichst mit dem Betreiber (Du-Form, Deutsch, kurz und konkret).

Du bekommst den aktuellen Stand der Verwaltung als JSON. Antworte nur mit Fakten aus diesem Stand; erfinde keine Zahlen. Wenn etwas nicht im Stand steht, sag das und nenne die Seite, auf der es zu finden ist.

Du darfst nur diese Aktionen VORSCHLAGEN (der Betreiber bestätigt jede per Klick; behaupte nie, etwas schon getan zu haben):
- lead_suche_starten: staedte (aus zielstaedte), branchen (Schlüssel aus branchen, leer = alle), punkte (Mindestgrenze 0–100 oder null = aktuelle)
- lead_suche_stoppen
- mindestgrenze_setzen: punkte
- mindestgrenze_anwenden: offene Leads unter der aktuellen Grenze aussortieren (umkehrbar, nichts wird gelöscht)
- seite_oeffnen: ziel = href aus seiten
- lead_aussortieren / lead_zurueckholen: leadId und name eines Leads (nur aus den Daten)
- warnungen_erledigen
- zielstadt_hinzufuegen / zielstadt_entfernen: staedte
Felder, die eine Aktion nicht braucht, setzt du leer ([] / null / "").

Nicht erlaubt (erkläre stattdessen, wo der Betreiber es selbst erledigt): Briefe versenden oder freigeben, Zahlungen, Erstattungen, Domains, Live-/Testmodus, Not-Aus, Löschen, rechtliche Freigaben oder Bewertungen. Keine Rechtsberatung, keine Versprechen.

Die „Punkte“ eines Leads sind die automatische Vorauswahl (0–100): Kampagnenbranche, Telefon, Öffnungszeiten, aktueller Eintrag, online aktiv ohne eigene Seite, keine eigene Domain, junger Betrieb. Sie sind keine Kaufwahrscheinlichkeit.`;

/** Eine Antwort von Claude (strukturiert, im Budget-Ledger gebucht). Ungültige Aktionen werden verworfen. */
export async function askAssistantAi(
  snapshot: AssistantSnapshot,
  history: AssistantTurn[],
  /** Antwort des Befehlsmodus (Daten aus der Datenbank) als Grundlage */
  offline = '',
): Promise<AssistantReply> {
  const cfg = await getConfig();
  const lastUser = [...history].reverse().find((h) => h.role === 'user')?.text ?? '';
  const wissen = searchKnowledge(lastUser, cfg, 3)
    .map((k) => `- ${k.entry.title}: ${k.entry.text(cfg)}`)
    .join('\n');
  const convo = history
    .slice(-10)
    .map((h) => `${h.role === 'user' ? 'Betreiber' : 'Assistent'}: ${h.text.slice(0, 1500)}`)
    .join('\n');
  const res = await llmStructured<{ antwort: string; aktionen: unknown[] }>({
    tier: 'assistant',
    purpose: 'admin_assistant',
    system: SYSTEM,
    prompt: `Stand der Verwaltung:\n${JSON.stringify(snapshot)}\n\nProjektwissen:\n${wissen || '–'}\n\nDaten aus der Datenbank (Befehlsmodus):\n${offline || '–'}\n\nGespräch:\n${convo}\n\nAntworte auf die letzte Nachricht des Betreibers.`,
    toolName: 'antworten',
    toolDescription: 'Antwort an den Betreiber mit optional vorgeschlagenen Aktionen',
    inputSchema: ASSISTANT_REPLY_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 1200,
    effort: 'low',
  });
  const aktionen = (Array.isArray(res.aktionen) ? res.aktionen : [])
    .map((a) => assistantActionSchema.safeParse(a))
    .filter((p) => p.success)
    .map((p) => p.data)
    .filter((a) => a.typ !== 'seite_oeffnen' || snapshot.seiten.some((p) => p.href === a.ziel))
    .slice(0, 4);
  return { antwort: String(res.antwort ?? '').slice(0, 2000), aktionen, modus: 'ki' };
}
