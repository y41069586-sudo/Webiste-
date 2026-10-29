import { describe, expect, it } from 'vitest';
import type { AssistantReply, AssistantTurn } from '../src/assistant/actions';
import { answerOffline } from '../src/assistant/engine';
import { searchKnowledge } from '../src/assistant/knowledge';
import { similar } from '../src/assistant/text';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { snapFixture, stubData } from './assistant-engine.helpers';

async function ask(q: string, history: AssistantTurn[] = [], calls: string[] = []): Promise<AssistantReply> {
  return answerOffline(q, { snap: snapFixture(), cfg: DEFAULT_CONFIG, data: stubData(calls), history });
}

describe('Assistent ohne KI: versteht Fragen zum ganzen Projekt', () => {
  it.each([
    ['Wie viele Leads in Bochum?', 'Leads (in Bochum): 2'],
    ['Zeig mir die besten Leads ab 50 Punkten', 'Elektro Krause'],
    ['Welche Leads sind aussortiert?', 'Hat bereits eine eigene Website'],
    ['Wie viele Demos muss ich prüfen?', 'Demos: zur Prüfung 2'],
    ['Wie viele Briefe wurden verschickt?', 'Briefe: erstellt 1'],
    ['Wie viel Umsatz haben wir?', '597,00 €'],
    ['Gibt es neue Anfragen?', 'Support: 4 offen'],
    ['Wie viel Geld haben wir diese Woche ausgegeben?', 'Ausgaben diese Woche: 1,20 €'],
    ['Wie viele Scans in den letzten 7 Tagen?', 'Letzte 7 Tage: Scans 3'],
    ['Läuft der Server?', 'Der Server läuft'],
    ['Was ist zuletzt passiert?', 'Zuletzt passiert'],
    ['Welche Einstellungen sind aktiv?', 'Testmodus'],
    ['Was sind die nächsten Schritte?', 'Als Nächstes'],
    ['Wieviel leads ham wir', 'Leads: 4 insgesamt'],
  ])('Daten: %s', async (q, expected) => {
    expect((await ask(q)).antwort).toContain(expected);
  });

  it.each([
    ['Was kostet die Website für Kunden?', '597 €'],
    ['Wie funktioniert die Lead-Suche?', 'NRW-Karte'],
    ['Was bedeuten die Punkte?', 'Kampagnenbranche'],
    ['Wie funktioniert der Versand?', 'easyNova'],
    ['Wie funktionert der versnad', 'easyNova'],
    ['Warum wurde ein Lead abgelehnt?', 'Geeignet ist ein Betrieb'],
    ['Darf ich Betriebe anrufen?', 'keine Kalt-E-Mails'],
    ['Wie update ich den Server?', 'setup.sh'],
    ['Wo stelle ich den Absender ein?', 'Einstellungen → Absender'],
    ['Erklär mir die Segmente', 'social_only'],
  ])('Wissen: %s', async (q, expected) => {
    expect((await ask(q)).antwort).toContain(expected);
  });

  it('versteht Rückfragen mit neuer Stadt', async () => {
    const r = await ask('und in Witten?', [{ role: 'user', text: 'Wie viele Leads in Bochum?' }]);
    expect(r.antwort).toContain('Leads (in Witten): 1');
  });

  it('findet Betriebe per Name und schlägt Aussortieren/Zurückholen vor', async () => {
    const out = await ask('Sortier Malerbetrieb Schulz aus');
    expect(out.aktionen[0]).toMatchObject({ typ: 'lead_aussortieren', name: 'Malerbetrieb Schulz' });
    expect(out.aktionen[0]!.leadId).toMatch(/^[0-9a-f-]{36}$/);
    const back = await ask('Hol "Salon Haarmonie" zurück');
    expect(back.aktionen[0]).toMatchObject({ typ: 'lead_zurueckholen', name: 'Salon Haarmonie' });
    const many = await ask('Malerbetrieb');
    expect(many.antwort).toContain('2 passende Betriebe');
    expect(many.aktionen).toHaveLength(0);
  });

  it('schlägt Zielstädte, Warnungen und Suchen als Aktion vor', async () => {
    expect((await ask('Füge Bochum als Zielstadt hinzu')).aktionen[0]).toMatchObject({
      typ: 'zielstadt_hinzufuegen',
      staedte: ['Bochum'],
    });
    expect((await ask('Entferne Dortmund aus den Zielstädten')).aktionen[0]).toMatchObject({
      typ: 'zielstadt_entfernen',
      staedte: ['Dortmund'],
    });
    expect((await ask('Warnungen erledigen')).aktionen[0]?.typ).toBe('warnungen_erledigen');
    const s = (await ask('Starte eine Suche für Handwerk')).aktionen[0]!;
    expect(s.typ).toBe('lead_suche_starten');
    expect(s.branchen.sort()).toEqual(['elektriker', 'maler']);
  });

  it('bleibt bei verbotenen Aufträgen hart, beantwortet aber Fragen dazu', async () => {
    expect((await ask('Schick die Briefe raus')).aktionen).toHaveLength(0);
    expect((await ask('Schick die Briefe raus')).antwort).toContain('selbst frei');
    expect((await ask('Kannst du die Zahlung erstatten?')).antwort).toContain('löse ich nicht aus');
  });

  it('grüßt mit Stand und gibt bei Unsinn Beispiele', async () => {
    expect((await ask('Hi')).antwort).toContain('Kurzer Stand');
    expect((await ask('Banane')).antwort).toContain('noch nicht verstanden');
  });

  it('Wissensbasis und Tippfehler-Toleranz', () => {
    expect(similar('versnad', 'versand')).toBe(true);
    expect(similar('viel', 'vielversprech')).toBe(false);
    expect(searchKnowledge('Was kostet das für Kunden', DEFAULT_CONFIG)[0]?.entry.id).toBe('preise');
  });
});
