# Recherchebasierte Akquiseprioritäten

Lokale Umsetzung26.10.2026 auf codex/conversion-v4, Basis807106e. Keine echte Recherche,
Kontakte, bezahlten Anbieteraufrufe, Produktionsmigrationen, Push oder Veröffentlichung.
DRY_RUN=true. Vorhandene Anbieter, Tabellen,20Templates, Preislogik und Versandgrenzen erhalten.

## Umsetzung der sechs Betreiberpunkte

| Vorgabe | Tatsächliche Umsetzung | Nachweis |
|---|---|---|
| Maler vor Reinigung vor Fliesen | Konfigurierbare geordnete Zielkampagne, aktive Branchen danach durchsuchen; Pipeline nimmt pro Tick zuerst die beste verfügbare Zielstufe und verwendet weiter bestehende Budgets/Segmentzuteilung. | acquisition.test.ts: Reihenfolge, aktive/inaktive Auswahl und hohe Sekundärscores |
| Zweite Wahl | Garten/Boden/Parkett/Entrümpelung in bestehende Branchenkonfiguration und passende textliche Fallbacks eingebunden. Andere Branchen/Layouts nicht gelöscht. | neue Default-Konfiguration, bestehende Template-Suiten |
| Website-Lücke genügt nicht | Aktivität, Anschrift, Eigenständigkeit, passender Leistungs-/Kundenfokus und konkretes aktuelles Akquisesignal separat erforderlich. Reale Quellen ohne Belege bleiben entdeckt/zur Recherche zurückgestellt. | positive/negative Unitfälle, tatsächliche Service- und Browserprüfungen |
| Junge Vollerwerbsbetriebe/Übernahmen/Wachstum |6–36Monate nur aus belegtem Geschäftsbeginn plus Vollerwerb bevorzugen; Übernahme/neues Angebot/Expansion als eigener Beleg. Ältere aktive Betriebe bleiben möglich. | Tests für echte Startdaten, fehlenden Vollerwerb, ältere/jüngere Betriebe und Verzeichnisdatum |
| Gründliche Website-/Ausschlussprüfung | Namen+Ort, Telefon, Verzeichnislinks und Profile einschließlich externer Links dokumentieren. Geschlossen/eigene Website/reine Subunternehmer/ausgelastet ohne Wachstum ausschließen. Auslastung plus Wachstum ist ein manueller Konflikt. | Tests für jeden fehlenden Suchschritt, fehlendes Telefon, Ausschlüsse, Quellenwiderspruch und veraltete Belege |
| Fakten für Brief und Demo, schriftlicher Kauf | Quellengesicherte Leistungen an LLM/Fallback und Demo-QA übergeben; dieselben Fakten an vorhandenen Briefwriter. Bestätigte Leistungen ersetzen generische Beispielkarten. Vorhandene Preise/Hosted-Checkout/Go-Live-Abrechnung/Supportwege unverändert. | drei tatsächliche komplette Demo-QA-Brief-Paare und V4-Preisregression |

## Belege und Zustände

Im bestehenden privaten Settings-Speicher liegt je Lead ein typisierter Recherchebeleg mit
Firmen-/Kontaktbindung, Website-Prüfung, Quellen, Beobachtungsdatum und ausdrücklich überprüften
Signalen. Keine neue Tabelle und kein zweites CRM. Im bestehenden Admin-Lead-Detail gibt es
ein geschütztes Formular und eine Liste fehlender oder widersprüchlicher Nachweise.
Formulare speichern beim Absenden, keine Netzwerkmutation pro Tastendruck.

- **Recherche offen:** kein Versandgrund aus leerem Website-Feld oder vorhandener Telefonnummer.
  Auch eine Social-URL allein beweist weder Aktivität noch Website-Abwesenheit.
- **Belegte Eignung:** alle notwendigen individuellen Kriterien dokumentiert. Weiterhin keine
  gestalterische, rechtliche, produktive oder kostenpflichtige Versandfreigabe.
- **Ausgeschlossen:** eindeutiger Ausschluss. Vorhandene Quelle mit eigener Website oder
  geschlossenem Status schlägt widersprüchliche positive Rechercheangaben.
- Mock-Leads ohne expliziten Beleg bleiben als isolierte Offline-Fixtures nutzbar. Sie dürfen
  durch den bereits bestehenden Mock-Quellen-/Live-Guard keine echten Sendungen erhalten.
  Reale Quellen dürfen diese Ausnahme nicht nutzen.

Aktivität/Anschrift/Eigenständigkeit/Leistungsfokus standardmäßig höchstens30Tage alt.
Akquisesignale höchstens90Tage, Website-Suche höchstens30Tage. Belege und Beobachtungen mit
zukünftigen Daten werden nicht akzeptiert. Verzeichnisdatum vergibt keine Gründungspunkte.
Bewertungen/Arbeitsbilder erhalten nur zusätzliche Qualitätspunkte, niemals Bedarf-/Kapazitätspunkte.
Ein hoher Score ist keine Kaufwahrscheinlichkeit. Unbekannte Angaben bleiben offen.

Gespeicherte Google-Maps-Inhalte werden über diesen neuen Pfad nicht zugelassen. Vorhandene
Google-Modus-/Lizenz-/Rechtsfreigaben bleiben unverändert; kein Scraping oder Quellenwechsel.
Arbeitsbilder als Signal erlauben weder Bildanalyse noch Veröffentlichung: dafür gilt weiterhin
der separate vorhandene Nachweis von Analyseberechtigung und Darstellungsrecht.

## Bestehende Arbeit erhalten

Der allgemeine Demo-Faktenhaken bestätigt nicht mehr automatisch Aktivität oder Website-Abwesenheit.
Die Prüfung vor Generierung, Freigabe und Versand liest die konkreten aktuellen Recherchebelege.
Ein manueller Qualifizieren-Button umgeht diese Prüfung nicht.

Brief, Demo und Betriebsdaten bleiben an bestehende Bild-/HTML-/PDF-/Routing-Hashes gebunden.
Geänderte Leistungen machen eine neue Demo-QA erforderlich. Eine bloße Aktualisierung von
Bedarf/Prüfdatum baut einen inhaltlich unveränderten Entwurf nicht neu. Der vollständige neue
Recherchebeleg ändert aber den Brieffreigabenachweis; alte PDFs werden vor Verwendung erneut geprüft.
Keine stillen Änderungen bereits veröffentlichter Entwürfe. Opt-out und die bestehende
Anonymisierung/Löschung entfernen jetzt auch die privaten Recherchebelege.

Telefonvergleich erkennt dieselbe Firma auch bei internationaler/nationaler Schreibweise und
abweichender Anschrift. Ein gemeinsamer Telefonanschluss allein wird nicht als Beweis identischer
Firmen behandelt. Bestehende Ketten-, Sperrlisten-, Adress- und Quell-ID-Prüfungen bleiben.

## Tatsächlich geprüfte Ergebnisse

-127 Core-Tests in17 relevanten Suiten bestanden. Darin14 neue reine Regelfälle und10 neue
  Service-/Integrationsfälle. Nach der letzten Quellenwiderspruch-Korrektur die14 Regelfälle
  nochmals bestanden; nicht als zusätzliche unabhängige Tests doppelt zählen.
-108 bestehende Template-Tests in3 Suiten bestanden.
- Browser-E2E mit eigenständiger lokaler Datenbank: Adminzugang erforderlich, Recherche speichern,
  Eignung sichtbar bestätigen, Akquisesignal entfernen, Eignung zurücknehmen und bestehendes
  Demo-HTML unverändert lassen.390px und1440px ohne horizontalen Seitenüberlauf.
- Monorepo-TypeScript, ESLint und vollständiger Paket-/Web-/Workerbuild: siehe evidence/verification.json.
- Drei tatsächlich generierte Demo-/QA-/Brief-Paare:
  [Maler-PDF](evidence/maler-brief.pdf), [Reinigungs-PDF](evidence/reinigung-brief.pdf),
  [Fliesen-PDF](evidence/fliesenleger-brief.pdf). Dazu jeweilige gespeicherte Demo-HTMLs,
  Desktop-/Mobilaufnahmen und aus PDF gerenderte Druckansichten unter evidence/.
- [Admin mobil](evidence/admin-390.png) · [Admin Desktop](evidence/admin-1440.png).

Alle Beispiele sind fiktiv, alle externen Anbieter Mock. Für die Prüfung der realen Quellenregeln
verwenden die isolierten Testzeilen bewusst den Quelltyp osm; sie stammen ausdrücklich nicht
aus einer echten OSM-Abfrage. Absenderdaten sind ausschließlich Test-/Platzhalterdaten.
Die Texte dieser drei funktionalen Prüfmuster sind gekennzeichnete regelbasierte Mock-Fallbacks,
keine echte KI-Textabnahme und keine neue gestalterische9,5/10-Abnahme. Lokale QR-Ziele sind
keine öffentlich nutzbaren Versandlinks. Keine Conversionverbesserung gemessen oder behauptet.

## Gefundene und korrigierte Fehler

1. Allgemeiner Demo-Review erzeugte unzulässig Verifikationspunkte für Aktivität/fehlende Website.
2. QA erhielt nicht dieselben bestätigten Leistungen wie die Generierung; dadurch scheiterte eine
   korrekte Ein-Leistungs-Demo an der alten Mindestanzahl generischer Karten. Belegstand jetzt gemeinsam.
3. Qualifikation ließ sich bei fehlendem Akquisesignal nicht sauber zurücknehmen. Bestehenden
   Statusübergang qualified→discovered für diesen belegten Rückzug ergänzt; Tracking bleibt vorwärtsgerichtet.
4. Im Admin erzeugten bestehende Tabellen und Timeline auf390px einen Seitenüberlauf. Grid/Flex
   gezielt begrenzt, Timeline schmal gestapelt, im Browser nachgeprüft.
5. Die ersten neuen Testläufe enthielten unvollständige Fixture-Pflichtfelder bzw. einen alten
   Lead ohne frisch vergebenen Kurzcode. Testdaten korrigiert; fehlgeschlagene Läufe zählen nicht.

## Rollout und offene externe Nachweise

Neue Defaults gelten für eine neue/leere Konfiguration. Bestehende gespeicherte Branchenarrays
werden bewusst nicht überschrieben. Beim separat genehmigten Rollout im vorhandenen
Einstellungsbereich die Zielbranchen aktivieren und mit der neuen geprüften Konfiguration abgleichen.
Keine Produktions-Konfigurationsmutation in dieser Sitzung.

Die Regeln erfassen und prüfen Recherchebelege, sie führen keine neue autonome Google-/Webrecherche
aus. Die echten Quellen müssen zulässig recherchiert und überprüft werden; fehlende Informationen
werden nicht automatisch ergänzt. Keine echte Suchabdeckung/Trefferqualität der neuen Branchen,
insbesondere Entrümpelung, in dieser Sitzung gemessen. Herkunft und tatsächliche Branchenzuordnung
realer Treffer bleiben Teil der Abnahme.

Echte KI-Qualität, Quellen-/Bildrechte, Betreiber-/Steuer-/Vertragsfreigaben, öffentliche Routen,
Worker/Provider/Sandbox und die erste manuell kontrollierte Kampagne bleiben separat abzunehmen.
Keine Preisänderung: Basis597+19/Monat, Care+597+insgesamt99/Monat, Monatsbeginn erst nach Go-Live.
Briefe bleiben preisfreie Einladungen; sämtliche Kosten vor einer Bestellung sichtbar.
