import type { LetterStatus } from '../types';

/**
 * Statusregeln für Briefe (10.11.2026).
 *
 * `cancelled` ist endgültig und nur aus fachlichen Gründen erlaubt: Werbewiderspruch/Sperrliste, gelöschter oder
 * abgelehnter Betrieb, abgelaufene Demo, Entscheidung des Betreibers oder Storno durch den Briefdienst.
 * Technische und behebbare Gründe (Demo ersetzt, Zuordnung veraltet, Dienst nicht erreichbar, Prüfung nicht verfügbar)
 * dürfen nie zu `cancelled` führen. Sie stellen den Brief zurück (`failed` mit Grund „Zurückgestellt: …“); er kann neu
 * erzeugt und danach wieder freigegeben werden.
 *
 * `queued` ohne Auftragsnummer des Briefdienstes bedeutet „wird gerade übergeben“. Erst mit Auftragsnummer gilt der
 * Brief als übermittelt, erst die Rückmeldung des Briefdienstes setzt `sent`.
 */
export const LETTER_TRANSITIONS: Record<LetterStatus, readonly LetterStatus[]> = {
  generated: ['approved', 'failed', 'cancelled'],
  approved: ['queued', 'sent', 'failed', 'cancelled'],
  queued: ['approved', 'sent', 'delivered', 'failed', 'cancelled'],
  sent: ['delivered', 'failed', 'cancelled'],
  delivered: [],
  failed: ['generated', 'cancelled'],
  cancelled: ['generated'],
};

export function canTransitionLetter(from: LetterStatus, to: LetterStatus): boolean {
  return LETTER_TRANSITIONS[from].includes(to);
}

/** Nicht übermittelte Briefe dürfen durch eine Neuerzeugung ersetzt werden. */
export const REPLACEABLE_LETTER_STATUSES: readonly LetterStatus[] = ['generated', 'failed', 'approved', 'cancelled'];

export const HOLD_PREFIX = 'Zurückgestellt: ';

/** Wurde dieser Brief je an einen Briefdienst übergeben? Dann nie ersetzen und nie erneut einreichen. */
export function wasSubmitted(letter: { providerLetterId: string | null; sentAt: Date | null; status: string }): boolean {
  return Boolean(letter.providerLetterId || letter.sentAt || ['queued', 'sent', 'delivered'].includes(letter.status));
}

/** Endgültige fachliche Sperre (Widerspruch, gelöscht, abgelehnt): rechtfertigt `cancelled`. */
export class LetterFinalBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LetterFinalBlockError';
  }
}

/** Eine nötige Prüfung oder Seite ist technisch nicht verfügbar. Kein Urteil über den Brief; später wiederholen. */
export class LetterCheckUnavailableError extends Error {
  constructor(
    public readonly check: 'site' | 'sources_page' | 'truth_llm',
    message: string,
  ) {
    super(message);
    this.name = 'LetterCheckUnavailableError';
  }
}
