/** Authored expected responses for offline integration/print review, NOT actual LLM outputs.
 * These fixtures never enter the production writer. No paid provider is used by this corpus.
 */
import type { InvitationDraft } from '../packages/core/src/letters/writer';
export function letterCopyFixture(index: number, name: string, facts: { id: string; text: string }[]): InvitationDraft {
  const texts = [
    [
      `${name}: eine Website-Idee für die nächste Projektanfrage`,
      `welche Elektroarbeiten passen zum geplanten Umbau? Für ${name} habe ich eine eigene Website-Idee vorbereitet, die bei dieser ersten Orientierung ansetzt.`,
      'Elektroinstallation ist darin ein eigener Bereich. Interessierte könnten vor einer Anfrage überblicken, ob Ihr Angebot zu ihrem Vorhaben passt – am Handy ebenso wie am Computer.',
      'Ihren Elektro-Entwurf kostenlos ansehen',
    ],
    [
      `Ein digitaler Einblick in ${name}`,
      'bei Lichtplanung geht es darum, sich eine Gestaltung vorstellen zu können. Eine Website könnte schon vor dem ersten Kontakt Orientierung zu Ihrem Angebot geben.',
      'Dafür ist ein persönlicher Entwurf entstanden. Schauen Sie sich an, wie Ihr Betrieb und das Thema Beleuchtung darin auf Smartphone und Computer präsentiert werden.',
      'Entdecken Sie Ihre Website-Idee',
    ],
    [
      `${name} – Ihr Photovoltaik-Angebot im Blick`,
      'wer sich mit Photovoltaik beschäftigt, möchte zuerst das Angebot eines Betriebs kennenlernen und offene Fragen zum eigenen Vorhaben sammeln.',
      'Genau diesen Einstieg greift Ihre persönliche Website-Vorschau auf. Sie zeigt eine mögliche Präsentation Ihres Angebots, die Sie vor einer Entscheidung in Ruhe ansehen können.',
      'Ihre Photovoltaik-Website-Idee ansehen',
    ],
    [
      `Farbideen von ${name}, jetzt als Website-Entwurf`,
      'Kalkfarben und Innenanstriche geben Interessierten bereits eine konkrete Vorstellung von Ihrem Angebot. Diese beiden Angaben habe ich für Ihren persönlichen Website-Entwurf aufgegriffen.',
      'So könnten sich Besucher vor einer Anfrage orientieren, welche Gestaltung für ihr Vorhaben infrage kommt. Die Vorschau zeigt, wie sich Ihr Betrieb dafür online präsentieren könnte.',
      'Ihre Farbwerk-Vorschau entdecken',
    ],
    [
      `${name}: ein Entwurf für Ihre Malerleistungen`,
      'ob eine Fassade oder ein Treppenhaus: Vor einer Anfrage möchten Interessierte ihr Vorhaben dem passenden Angebot zuordnen können.',
      'Das Thema Fassadenanstriche steht deshalb in dieser persönlichen Website-Idee im Mittelpunkt. Schauen Sie sich an, wie Ihre Leistungen und der Weg zum Kontakt darin zusammenkommen könnten.',
      'Den persönlichen Maler-Entwurf ansehen',
    ],
    [
      `Eine Website-Idee für ${name}`,
      'Lackierarbeiten und Tapezierarbeiten lassen sich auf einer Website verständlich nebeneinander zeigen. So könnten Interessierte vorab einordnen, was zu ihrem Renovierungsvorhaben passt.',
      'Für Ihren Betrieb habe ich dazu einen eigenen Entwurf gestaltet. Die Vorschau zeigt die Präsentation auf Laptop und Smartphone – Sie können beides unverbindlich ansehen.',
      'So könnte Raumidee online aussehen',
    ],
    [
      `${name}: Gartenpflege schon online entdecken`,
      'wer Unterstützung für die Gartenpflege sucht, möchte den gewünschten Umfang möglichst klar anfragen können. Ihre Website-Idee setzt bei dieser ersten Orientierung an.',
      'Gartenpflege und Heckenschnitt sind in der Vorschau aufgegriffen. So könnten sich Interessierte zunächst über Ihr Angebot informieren und ihren Kontakt mit Ihnen vorbereiten.',
      'Ihre Garten-Website-Idee öffnen',
    ],
    [
      `Mehr Raum für die Website-Idee von ${name}`,
      'wie lässt sich eine Gartenidee in eine erste Anfrage übersetzen? Ein Überblick über Ihr Angebot könnte Interessierten dabei helfen, ihr Vorhaben zu beschreiben.',
      'Für Ihren Betrieb ist dazu ein eigener Website-Entwurf mit dem Thema Gartenplanung entstanden. Entdecken Sie, wie Ihre Leistungen auf dem Smartphone und am Computer wirken könnten.',
      'In Ihren Gartenatelier-Entwurf schauen',
    ],
    [
      `${name} – Ihr Angebot als Website-Vorschau`,
      'Fensterreinigung und Büroreinigung sprechen unterschiedliche Anliegen an. Eine übersichtliche Website könnte vor einer Anfrage zeigen, welcher Bereich zum Bedarf passt.',
      'Für Ihren Betrieb habe ich dazu eine persönliche Vorschau vorbereitet. Entdecken Sie, wie Ihre Leistungen und der Kontaktweg online zusammenkommen könnten.',
      'Ihren Reinigungs-Entwurf entdecken',
    ],
    [
      `Ihr Sanitärangebot als persönliche Website-Idee`,
      `für ${name} habe ich einen Entwurf vorbereitet, der Badmodernisierung als eigenen Leistungsbereich zeigt.`,
      'Wer ein Badvorhaben plant, könnte sich so zunächst über Ihr Angebot orientieren und seine Fragen zum gewünschten Umfang zusammentragen. Die Vorschau lässt sich direkt am Handy öffnen.',
      'Den Entwurf für Ihren Betrieb ansehen',
    ],
    [
      `${name}: der erste Eindruck vor dem Besuch`,
      'Haarschnitte und Bartpflege gehören zu Ihrem Angebot. Ein eigener Webauftritt könnte Interessierten schon vor dem Besuch zeigen, worum es bei Ihrem Barber-Angebot geht.',
      'Die passende Website-Idee ist bereits vorbereitet. Entdecken Sie die Gestaltung für Ihren Betrieb – mit einer eigenen Ansicht für Smartphone und Computer.',
      'Ihre Barber-Website-Idee entdecken',
    ],
    [
      `Eine Website-Idee für die Farbangebote von ${name}`,
      'bei Farbbehandlungen entstehen Wünsche und Fragen häufig schon vor dem Termin. Ihre Website könnte eine erste Orientierung geben und den Einstieg in eine Anfrage erleichtern.',
      'Für Ihren Salon habe ich dazu eine persönliche Vorschau gestaltet. Schauen Sie sich an, wie Ihr Angebot darin präsentiert wird, bevor Sie über eine Umsetzung nachdenken.',
      'Den Website-Entwurf für Ihren Salon ansehen',
    ],
    [
      `${name}: Ihr Studio als Website-Entwurf`,
      'Maniküre und Nagelgestaltung sind für Ihre persönliche Website-Idee die Ausgangspunkte. Interessierte könnten Ihr Angebot damit schon vor einer Terminanfrage kennenlernen.',
      'Wie könnte diese Präsentation für Ihr Studio aussehen? Die vorbereitete Vorschau zeigt es auf Smartphone und Computer. Sie können sie ohne Anmeldung öffnen.',
      'Ihre Studio-Vorschau entdecken',
    ],
    [
      `Ein erster Online-Einblick in ${name}`,
      'vor einer Anfrage zu Gesichtsbehandlungen ist eine ruhige, verständliche Übersicht hilfreich. Sie könnte Interessierten zeigen, welches Angebot sie in Ihrem Studio erwartet.',
      'Dafür habe ich einen eigenen Website-Entwurf vorbereitet. Er greift Ihre Angaben auf und zeigt eine mögliche Gestaltung, die Sie unverbindlich prüfen können.',
      'Ihren Kosmetik-Entwurf kostenlos ansehen',
    ],
    [
      `${name}: ein Vorgeschmack auf Ihren Webauftritt`,
      'ein Blick auf die Abendkarte könnte Gästen die Entscheidung für einen Besuch erleichtern. In Ihrer persönlichen Website-Idee bekommt dieses Angebot deshalb einen eigenen Platz.',
      'Der Entwurf zeigt, wie sich Ihr Restaurant online vorstellen könnte. Öffnen Sie die Vorschau und machen Sie sich selbst ein Bild – am Computer oder direkt auf dem Smartphone.',
      'Die Vorschau für Ihr Restaurant entdecken',
    ],
    [
      `Ein Blick ins mögliche Online-Café von ${name}`,
      'Kaffee und Kuchen geben Ihrer Website-Idee einen konkreten Mittelpunkt. Gäste könnten sich so schon unterwegs einen ersten Eindruck von Ihrem Angebot verschaffen.',
      'Für Ihr Café ist dazu eine eigene Vorschau entstanden. Schauen Sie sich die Gestaltung an und entscheiden Sie anschließend in Ruhe, ob sie zu Ihrem Betrieb passt.',
      'In Ihren Café-Entwurf schauen',
    ],
    [
      `${name} – Ihr Außer-Haus-Angebot im Web`,
      'wer etwas zur Abholung sucht, möchte sich zunächst zum Angebot orientieren. Ihre persönliche Website-Vorschau greift dafür Ihr Außer-Haus-Angebot auf.',
      'Schauen Sie sich an, wie Ihr Restaurant dafür online auftreten könnte. Es ist eine konkrete Gestaltungsidee zum Ansehen, kein bereits freigeschaltetes Bestellsystem.',
      'Ihre Restaurant-Website-Idee öffnen',
    ],
    [
      `Ein digitales Schaufenster als Idee für ${name}`,
      'Buchbestellungen sind ein konkreter Anlass, sich mit Ihrem Geschäft in Verbindung zu setzen. Eine Website könnte dieses Angebot auch vor einem Besuch sichtbar machen.',
      'Ihre persönliche Vorschau zeigt eine mögliche Präsentation Ihrer Buchhandlung. Entdecken Sie, wie Ihr Geschäft im Internet aussehen könnte – ohne gleich einen Online-Shop betreiben zu müssen.',
      'Die Website-Idee für Ihre Buchhandlung ansehen',
    ],
    [
      'Eine Website-Idee für Ihren Klavierunterricht',
      `für ${name} ist ein persönlicher Website-Entwurf entstanden, der Klavierunterricht verständlich vorstellt.`,
      'Interessierte könnten sich vor einer Anfrage zunächst orientieren und überlegen, was sie lernen möchten. Die Vorschau zeigt, wie Ihr Unterrichtsangebot dafür online präsentiert werden könnte.',
      'Ihren Unterrichts-Entwurf entdecken',
    ],
    [
      `Der erste Schritt zur Website-Idee von ${name}`,
      'Paartanz ist für Interessierte ein konkreter Einstieg in Ihr Angebot. Eine Website könnte vor einer Anfrage zeigen, welches Thema sie bei Ihnen erwartet.',
      'Dazu habe ich eine eigene Gestaltung für Ihr Tanzatelier vorbereitet. Öffnen Sie die persönliche Vorschau und sehen Sie sich an, wie Ihr Angebot auf dem Handy und am Computer wirken könnte.',
      'Die Vorschau für Ihr Tanzatelier ansehen',
    ],
    [
      `Ein Website-Entwurf für die Badideen von ${name}`,
      'bei einer Badsanierung möchten Interessierte zunächst wissen, ob ihr Vorhaben zum Angebot eines Betriebs passt. Eine klare Leistungsübersicht könnte diesen Einstieg erleichtern.',
      `Für ${name} habe ich eine eigene Website-Idee vorbereitet. Fliesenverlegung hat darin einen eigenen Platz – sehen Sie sich an, wie sich Ihr Angebot am Handy und am Computer präsentieren könnte.`,
      'Den Website-Entwurf für Ihre Fliesenarbeiten ansehen',
    ],
    [
      `${name}: Ihre Fliesenarbeiten als Website-Idee`,
      'Wandfliesen und Fugensanierung sind unterschiedliche Anliegen. Auf einer eigenen Website könnten Interessierte das passende Angebot finden und ihre erste Anfrage vorbereiten.',
      'Die persönliche Vorschau greift genau diese beiden Angaben auf. Öffnen Sie den Entwurf und prüfen Sie selbst, ob diese Präsentation zu Ihrem Betrieb passt.',
      'Ihre persönliche Fliesen-Vorschau öffnen',
    ],
    [
      `Eine Website-Idee für die Objektanfragen an ${name}`,
      'bei einer Anfrage zur Büroreinigung sind andere Angaben wichtig als bei einem Treppenhaus. Eine übersichtliche Website könnte helfen, das gewünschte Objekt und den Umfang einzuordnen.',
      'Dafür ist ein eigener Entwurf für Ihren Betrieb entstanden. Er zeigt Ihr bestätigtes Angebot und wie Interessierte den Kontakt zu Ihnen vorbereiten könnten.',
      'Ihren Objektpflege-Entwurf kostenlos ansehen',
    ],
    [
      `${name} – ein digitaler Einblick in Ihr Angebot`,
      'Unterhaltsreinigung ist für Interessierte ein konkreter Ausgangspunkt. Vor einer Objektanfrage könnte eine eigene Website zeigen, welches Angebot sie bei Ihnen erwartet.',
      'Ihre persönliche Vorschau stellt dafür Unterhaltsreinigung und Büroreinigung nebeneinander. Sehen Sie sich die Gestaltung unverbindlich an, bevor Sie über eine Umsetzung entscheiden.',
      'Ihre Reinigungs-Website-Idee entdecken',
    ],
  ][index]!;
  const [subject, opening, benefit, qrCaption] = texts;
  return {
    subject: subject!,
    opening: opening!,
    benefit: benefit!,
    qrCaption: qrCaption!,
    factIds: facts.filter((f) => `${opening} ${benefit}`.toLowerCase().includes(f.text.toLowerCase())).map((f) => f.id),
  };
}
