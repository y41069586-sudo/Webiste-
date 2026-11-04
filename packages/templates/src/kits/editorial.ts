import type { BranchGroup } from '../types';

/** Shared contract for copy generation, rendering and operator review. No generated code or new API calls. */
export const EDITORIAL_VERSION = 'seitenwerk-editorial-1';
export interface EditorialPlan {
  version: typeof EDITORIAL_VERSION;
  composition: 'panorama' | 'werkstatt' | 'raster' | 'kontakt' | 'objekt' | 'studio' | 'speisekarte' | 'angebot';
  visitorTask: string;
  copyFocus: string;
  imagePurpose: string;
  review: string[];
}

export function editorialPlan(group: BranchGroup, branch: string, verifiedServices: string[] = []): EditorialPlan {
  const b = branch.toLocaleLowerCase('de');
  let composition: EditorialPlan['composition'] = 'angebot';
  let visitorTask = 'Angebot verstehen und eine konkrete Anfrage stellen.';
  let copyFocus = 'Den belegten Angebotsbereich verständlich beschreiben; keine austauschbaren Werbesätze.';
  let imagePurpose = 'Passendes Angebot illustrieren; Stockmaterial niemals als Betriebsnachweis ausgeben.';
  if (group === 'gastronomie') {
    composition = 'speisekarte';
    visitorTask = 'Angebot, Öffnungszeiten und Lage erfassen; Karte ansehen oder einen Tisch anfragen.';
    copyFocus = 'Bestätigte Angebotsbereiche in natürlichem Deutsch. Keine erfundenen Gerichte, Zutaten, Herkunft oder Preise.';
    imagePurpose = 'Essen und Atmosphäre; keine Aussage über tatsächlich servierte Gerichte aus Stockfotos ableiten.';
  } else if (group === 'beauty') {
    composition = 'studio';
    visitorTask = 'Passende Behandlung finden und einen Termin anfragen; keine sofortige Buchung suggerieren.';
    copyFocus = 'Belegte Behandlungen erklären. Keine erfundenen Ergebnisse, Produkte oder Qualifikationen.';
    imagePurpose = 'Behandlung oder Raumgefühl zeigen; keine fremden Personen als Team oder Behandlungsergebnis darstellen.';
  } else if (group === 'handwerk') {
    if (/maler|anstrich|lackier|tapezier/.test(b)) {
      // A different composition follows the actual offered work, never the company name or random rotation.
      composition = verifiedServices.some((s) => /innen|wohn|raum|wand|tapezier/i.test(s)) ? 'panorama' : 'werkstatt';
      visitorTask = 'Passende Malerleistung erkennen und das eigene Vorhaben schildern.';
      copyFocus =
        'Bestätigte Flächen oder Arbeiten konkret nennen; keine erfundene Qualität, Sorgfalt oder Beratung versprechen.';
      imagePurpose =
        composition === 'panorama'
          ? 'Raum und Oberfläche im Zusammenhang zeigen.'
          : 'Arbeit oder Material als konkreten Einstieg zeigen.';
    } else if (/fliese|bad|naturstein|platten|estrich|boden/.test(b)) {
      composition = 'raster';
      visitorTask = 'Leistung und Anwendung einordnen; ein Bau- oder Renovierungsvorhaben anfragen.';
      copyFocus =
        'Nur belegte Materialien und Anwendungen nennen; keine erfundene Badsanierung aus einer Fliesenleistung ableiten.';
      imagePurpose = 'Material, Fuge oder passende Anwendung; Symbolbild von Referenzarbeit unterscheiden.';
    } else if (/elektr|sanit|heizung|install|klima|solar/.test(b)) {
      composition = 'kontakt';
      visitorTask = 'Passende Tätigkeit und direkte Kontaktmöglichkeit erkennen.';
      copyFocus = 'Konkretes Gewerk, bestätigte Leistungen und Anfrage. Kein unbelegter Notdienst oder Terminversprechen.';
      imagePurpose = 'Passende Installation oder Arbeit, keine unbelegten Hersteller oder Qualifikationen.';
    } else {
      composition = 'objekt';
      visitorTask = 'Leistungsumfang verstehen und Objekt oder Vorhaben anfragen.';
      copyFocus = 'Belegte Objektarten und Tätigkeiten; keine erfundenen Turnusse, freien Kapazitäten oder Festpreise.';
      imagePurpose = 'Tätigkeit oder Objekt passend zum Angebot; keinen erfundenen Wochenplan als reale Verfügbarkeit zeigen.';
    }
  }
  return {
    version: EDITORIAL_VERSION,
    composition,
    visitorTask,
    copyFocus,
    imagePurpose,
    review: [
      'Erster Bildschirm: Betrieb, Tätigkeit und passende Handlung verständlich?',
      'Ein bis zwei bestätigte Leistungen sichtbar, ohne neue Fakten zu erfinden?',
      'Bilder passend, Rechte geklärt und Symbolbilder erkennbar?',
      'Ganze Seite: klare Hierarchie, keine leeren Foto-/Projektflächen oder doppelten Texte?',
      'Mobilansicht: lesbar, unbeschnitten und Hauptaktion erreichbar?',
      'Kontaktfunktion entspricht dem Versprechen; Anfrage ist keine Buchung?',
    ],
  };
}
