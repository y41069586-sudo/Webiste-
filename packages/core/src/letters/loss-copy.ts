/** Feste Texte des Briefs „Kunden, die Sie gerade verlieren könnten“ (ohne Datenbankbezug). */
export const LOSS_LETTER_VERSION = 'kunden-verlieren-1';

export function lossSubject(businessName: string): string {
  return businessName.length <= 40
    ? `${businessName}: Kunden, die Sie gerade verlieren könnten`
    : 'Kunden, die Sie gerade verlieren könnten';
}

/** Aufhänger aus Sicht einer suchenden Person – Möglichkeit, keine Behauptung, keine Zahl. */
export function lossHook(branchLabel: string, city: string): string {
  const place = city.length <= 32 ? ` in ${city}` : '';
  const b = branchLabel.toLocaleLowerCase('de');
  if (/restaurant|café|cafe|bistro|gastronom|imbiss|pizzeria|bar\b|kneipe|bäcker|eis/.test(b))
    return `wer${place} ein Lokal für heute Abend sucht und online nichts Eigenes von Ihnen findet, geht womöglich woanders essen.`;
  if (/fris[öe]|friseur|haar|barber|barbier|kosmetik|nagel|nail|beauty|massage|studio/.test(b))
    return `wer${place} einen Termin sucht und online nichts Eigenes von Ihnen findet, bucht womöglich anderswo.`;
  if (/handel|laden|boutique|blumen|buch|mode|geschäft|shop/.test(b))
    return `wer${place} vor dem Einkauf nachsieht, was es wo gibt, und online nichts Eigenes von Ihnen findet, kauft womöglich woanders.`;
  if (/kurs|training|yoga|tanz|musik|fitness|pilates|schule/.test(b))
    return `wer${place} einen Kurs sucht und online nichts Eigenes von Ihnen findet, meldet sich womöglich woanders an.`;
  return `wer${place} einen Betrieb wie Ihren sucht und online nichts Eigenes von Ihnen findet, fragt womöglich beim nächsten an.`;
}

export const LOSS_BRIDGE =
  'Deshalb habe ich für Ihren Betrieb eine eigene Website gebaut – mit Ihrem Namen, Ihrer Adresse und Ihren Kontaktdaten.';
