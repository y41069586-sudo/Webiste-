import { describe, expect, it } from 'vitest';
import { assistantActionSchema, describeAction, type AssistantSnapshot } from '../src/assistant/actions';
import { runCommand } from '../src/assistant/commands';

const snap = (over: Partial<AssistantSnapshot> = {}): AssistantSnapshot => ({
  jetzt: '2026-10-29T06:00:00Z',
  modus: 'test',
  notAus: false,
  zielstaedte: ['Dortmund', 'Bochum'],
  branchen: [
    { key: 'maler', label: 'Maler', gruppe: 'handwerk' },
    { key: 'elektriker', label: 'Elektriker', gruppe: 'handwerk' },
    { key: 'friseur', label: 'Friseur', gruppe: 'beauty' },
  ],
  mindestPunkte: 70,
  leads: { status: { discovered: 12, qualified: 3, rejected: 40 }, offenAbGrenze: 2, offenUnterGrenze: 13, besterWert: 74 },
  suche: { laeuft: false, wartend: 0, phase: null, text: null, prozent: null, zaehler: null, letzteMeldung: null },
  offen: { demosPruefen: 1, briefeFreigeben: 0, support: 2, warnungen: 0 },
  pflichtangaben: ['Absender: Name'],
  seiten: [
    { href: '/admin/suche', label: 'Akquise → Lead-Suche' },
    { href: '/admin/leads', label: 'Akquise → Leads' },
    { href: '/admin/letters', label: 'Akquise → Briefe freigeben' },
  ],
  ...over,
});

describe('Assistent: Befehlsmodus', () => {
  it('schlägt eine Suche mit Stadt, Branchengruppe und Grenze vor', () => {
    const r = runCommand('Starte die Suche in Bochum für Handwerk ab 60 Punkten', snap());
    expect(r.aktionen).toHaveLength(1);
    const a = r.aktionen[0]!;
    expect(a).toMatchObject({ typ: 'lead_suche_starten', staedte: ['Bochum'], punkte: 60 });
    expect(a.branchen.sort()).toEqual(['elektriker', 'maler']);
    expect(assistantActionSchema.parse(a)).toEqual(a);
    expect(describeAction(a, snap())).toContain('ab 60 Punkten');
  });

  it('nimmt ohne Angaben die erste Zielstadt und alle Branchen', () => {
    const a = runCommand('finde neue leads', snap()).aktionen[0]!;
    expect(a).toMatchObject({ typ: 'lead_suche_starten', staedte: ['Dortmund'], branchen: [], punkte: null });
  });

  it('meldet den Fortschritt und bietet Stopp an', () => {
    const running = snap({
      suche: {
        laeuft: true,
        wartend: 0,
        phase: 'pruefen',
        text: 'Prüfe 5 von 20: Malerbetrieb',
        prozent: 40,
        zaehler: { found: 20, checked: 5, qualified: 1, needsReview: 0, belowMin: 3, rejected: 1 },
        letzteMeldung: null,
      },
    });
    expect(runCommand('Was läuft gerade?', running).antwort).toContain('40 %');
    expect(runCommand('Stopp die Suche', running).aktionen[0]?.typ).toBe('lead_suche_stoppen');
    expect(runCommand('Stopp die Suche', snap()).aktionen).toHaveLength(0);
    expect(runCommand('starte eine suche', running).aktionen[0]?.typ).toBe('seite_oeffnen');
  });

  it('setzt und wendet die Mindestgrenze an', () => {
    expect(runCommand('Setz die Grenze auf 55', snap()).aktionen[0]).toMatchObject({ typ: 'mindestgrenze_setzen', punkte: 55 });
    expect(runCommand('Leads unter der Grenze aussortieren', snap()).aktionen[0]?.typ).toBe('mindestgrenze_anwenden');
    expect(runCommand('Welche Mindestgrenze gilt?', snap()).antwort).toContain('70');
  });

  it('lehnt Versand, Zahlungen und Löschen ab', () => {
    for (const q of [
      'Schick alle Briefe los',
      'Versende die Briefe',
      'Erstatte die Zahlung',
      'Lösch alle Leads',
      'Schalte Live-Modus an',
    ])
      expect(runCommand(q, snap()).aktionen).toHaveLength(0);
  });

  it('nennt nächste Schritte und öffnet Seiten', () => {
    const steps = runCommand('Was sind die nächsten Schritte?', snap()).antwort;
    expect(steps).toContain('Pflichtangaben');
    expect(steps).toContain('Demo');
    expect(runCommand('Öffne die Briefe', snap()).aktionen[0]).toMatchObject({ typ: 'seite_oeffnen', ziel: '/admin/letters' });
  });

  it('lässt nur Pfade unter /admin zu', () => {
    expect(assistantActionSchema.safeParse({ typ: 'seite_oeffnen', ziel: 'https://evil.example' }).success).toBe(false);
    expect(assistantActionSchema.safeParse({ typ: 'seite_oeffnen', ziel: '//evil.example' }).success).toBe(false);
    expect(assistantActionSchema.safeParse({ typ: 'briefe_senden' }).success).toBe(false);
  });
});
