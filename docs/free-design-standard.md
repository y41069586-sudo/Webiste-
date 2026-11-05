# Individuelle Demo-Gestaltung — free-design-1

## Ergebnis

Neue `buildDemo`-Aufträge verwenden ein durch das Modell selbst verfasstes HTML-Fragment und CSS.
`authored-<gruppe>` ist nur die Kompatibilitätskennung für gespeicherte Inhalte, nicht ein
Seitenlayout. `chooseTemplate` rotiert keine Branchenvorlagen oder Farbwelten mehr. Ein Konzept
begründet die Gestaltung mit Besucheraufgabe und vorhandenen Fakten. Die Betriebseite ist frei;
Kaufleiste, bestehender Kontakt-Renderer und Freigaben bleiben außerhalb ihres Gestaltungsbereichs.

Qualität: klare Identität/Tätigkeit/Ort/Handlung, sinnvolle Informationsdichte, passende Bilder,
eigenständige Mobilgestaltung, lesbare Texte, konkrete Sprache und keine erfundenen Eigenschaften.
Kein automatisches Verbot von Farben, Rundungen oder ähnlichen Gestaltungsmitteln.

## Technische Integration

- HTML mit parse5: erlaubte passive Elemente, eindeutige eigene IDs, interne Sprungziele,
  Fakten-/Bildtokens. Keine Scripts, Embeds, Styles, Events oder eigenen Formulare.
- CSS mit PostCSS/Selector-Parser: jede Regel unter `#sw-ai-design`; keine globalen oder relativen
  Selektoren, externen Ressourcen, importierten Fonts, aktiven Inhalte, CSS-Textbehauptungen,
  !important- oder verschachtelten Regeln. Medien-/Supports-Regeln bleiben möglich.
- Layout-/Paint-Containment verhindert Übermalen des außerhalb liegenden Kauf-/Kontaktbereichs.
  Lokale Schriften sind Ressourcen, keine vorgegebenen Paarungen. Theme-Textkontraste ≥4,5:1;
  individuell gesetzte Farben werden zusätzlich im Browser geprüft.
- Quellenwerte werden über geparste DOM-Knoten eingesetzt; keine HTML-Interpolation ungeprüfter
  Fakten. Bildslots nutzen vorhandene freigegebene Bilder, Symbolbilder erhalten einen Hinweis.
  Fehlende Bilder werden entfernt; der tatsächliche Umbruch bleibt eine Browser-/Freigabeprüfung.
- Sichtbare individuelle Texte werden in die bestehenden Faktenfilter und KI-QA einbezogen.
  Inhaltsbehauptungen lassen sich nicht durch `aria-hidden` oder CSS `content` verstecken.
  Unbestätigte Beispiel-Leistungen brauchen auch im individuellen HTML eine Kennzeichnung.
- Derselbe budgetierte kreative Aufruf erzeugt Inhalte und Gestaltung, maximal zwei bestehende
  Versuche; Ausgabelimit jetzt 10.000 Tokens. Kostenreservierung/Budgetprüfung bleiben bestehen.
  Kein zusätzlicher Modelllauf wurde für die Entwicklung ausgeführt. Keine Wirkungs-/Qualitätsgarantie.
- Alte Kit-/Vorlagen-Datensätze funktionieren weiter. Neue Entwürfe ohne gültiges Design werden
  blockiert statt durch eine Standardseite ersetzt.
- Kundenüberarbeitung fordert aktualisiertes Design an. Exakte Textkorrekturen können bestehende
  DOM-Texte ersetzen; unzuordenbare/neu hinzukommende Abschnitte benötigen individuelle Überarbeitung.
  Ein blockierter Fallback behauptet keine erfolgreiche Änderung. Vertrags-/Zahlungs-/Versandlogik unverändert.

## Abnahme und Grenzen

Lokal bestanden: 182 Template-/Renderer-Tests und 25 isolierte Core-Tests (ohne DB-Reset),
Core-/Template-Typechecks, ESLint für die geänderten TS-Dateien und `git diff --check`.
Der isolierte Core-Lauf verwendet das installierte Chromium und 15 Sekunden Testlimit wegen
kaltem Modulimport/Browserstart; ein paralleler Lauf mit Standardlimit lief zuvor in Timeouts.
Der aktuelle serielle Lauf besteht vollständig. Die vollständige DB-Integrationssuite wurde
wegen ihres destruktiven Reset-Setups nicht gegen die angebundene Datenbank ausgeführt.

Pilot: Inhalts- und HTML-Validierung bestanden, sieben Breiten (320, 360, 390, 430, 768, 1024,
1440 px) ohne Überlauf, Bilder dekodiert, alle internen Sprungziele vorhanden, genau ein h1,
Entwurfsformular deaktiviert, keine JS-Fehler. axe meldet bei 390/1440 px keine WCAG-A/AA-Befunde.
Die tatsächlichen Ansichten wurden visuell geprüft; fehlende Pfeilglyphen und ein fehlerhafter
figcaption-Aufbau wurden korrigiert. Kein bezahlter Provider-Lauf oder Conversion-Nachweis.
Ein Quellvergleich bestätigt: bestehender Kontaktbaustein und Checkout-Quelltext unverändert;
Veröffentlichungs-/Zahlungs-/Freigabefunktionen nach der Inhaltsüberarbeitung ebenfalls unverändert.
Kein produktiver Worker gestartet,
keine vorhandene Demo neu erzeugt/freigegeben und keine Produktionskonfiguration umgestellt.
Die visuelle Pilotseite ist ein privater, unbeauftragter Vorschlag für Jörg Stoffeln in Bochum.
Sie verwendet dieselbe freie Renderstrecke, mit von diesem Assistenten erstelltem HTML/CSS anstelle
eines kostenpflichtigen Provider-Aufrufs. Die Modellqualität im produktiven Sonnet-Aufruf ist dadurch
noch nicht empirisch abgenommen. Jeder Entwurf braucht weiterhin die vorhandene manuelle Freigabe.


## Veröffentlichung und Worker-Update

Der Betreiber hat die Übernahme in `claude/website-brief-maschine-0d0s37` und die Veröffentlichung
am 04.11.2026 ausdrücklich beauftragt. Der vorhandene Netlify-Connector bietet keinen Deploy-Start;
in dieser Laufzeit ist kein Netlify-CLI/API-Token konfiguriert. Kein Produktionsdeploy ohne
Erfolgsmeldung behaupten. Das gilt getrennt vom bereits veröffentlichten privaten Demo-Site.

`infra/vps/update-worker.sh` aktualisiert einen bestehenden Worker mit einem vollständig gepinnten
`RELEASE`-Commit, lässt private `.env.worker`-Werte unangetastet und übernimmt die Compose-Dateien
des aktuellen Containers. Vorhandener DRY_RUN und laufender/pausierter Zustand bleiben erhalten.
Kein Paket-/Firewall-Neuaufbau, keine Modusumschaltung, kein pauschales Entfernen anderer Container.
Das neue Image muss vor dem Austausch `free-design-1` exportieren. Fehler beim Build oder der
Imageprüfung lassen den bisherigen Container bestehen. Nach Start wird sein Healthcheck geprüft.
Sechs isolierte Python-Tests für diese Zustands-/Fehlerfälle und Bash-Syntaxprüfung bestanden.
Die Netlify-App muss den neuen Stand übernehmen, bevor neue freie Demos produktiv abgewickelt werden.

## Nachbesserung 05.11.2026 (Claude, Betreiberauftrag „die Websites sind so kurz“)

- **Vollständige Seiten statt Kurzseiten:** Die Regel „wenig Information ergibt eine kurze Seite“ ist ersetzt. Pflicht-Inhalte
  (Gestaltung und Reihenfolge frei): Leistungen mit fachlicher Erklärung (Branchenwissen, keine Betriebsbehauptung),
  gekennzeichneter Beispielablauf einer Anfrage, „Gut vorbereitet anfragen“, Eindrücke mit Bildslots, 3–4 Fragen zum
  Ablauf, Standort und Kontakt. `authoredCompleteness` prüft bei jeder Generierung ≥ 6 h2-Abschnitte, ≥ 1800 Zeichen
  sichtbaren Text und ≥ 2 genutzte Bildslots (falls vorhanden); Verstöße gehen als Rückmeldung in den zweiten Versuch.
  Die KI-QA wertet Fachwissen, Beispielablauf und Vorbereitungshinweise ausdrücklich nicht als erfundene Fakten.
  Platzhalter für eigene Fotos/Team/Referenzen erzeugt das System nur im Entwurf außerhalb des KI-Bereichs.
- **Ladezeit:** Archivo für freie Entwürfe als Instanz `archivo-free` (Stärken 400–900, normale Breite, 34 statt 90 KB);
  ungenutztes Tailwind-CSS wird wie bei den Kits entfernt. Live-Seite 230 → 120 KB, Lighthouse 99 → 100 lokal
  (auf dem VPS fiel eine 237-KB-Seite am 04.11. mit 81 durch).
- **Geschützter Kontaktbereich:** übernimmt Schrift und Farben des KI-Entwurfs (Linien/Nebentext aus den Farbrollen
  gemischt); die Kit-Regeln greifen jetzt auch außerhalb von `<main>`. Markup und Formular-Logik unverändert.
- **Kostenlose Änderung vor dem Kauf:** Zusätzliche oder entfallende Leistungen/Fragen werden im Aufbau eines
  vorhandenen Eintrags in den Entwurf übernommen statt blockiert; nur ein nicht erkennbarer Aufbau blockiert weiter.
- **Tests:** vollständige Core-Suite (lokale Test-DB) statt nur isolierter Tests; Barrierefreiheit der freien Seiten
  mit einem vollständigen Testentwurf; Fall „KI liefert zweimal Unbrauchbares“ stoppt bewusst ohne Vorlagen-Ersatz.


Aktualisierung 05.11.2026: `full-page-1` und die vereinigte Umsetzung mit f77bbef folgen `docs/authored-full-pages.md`; frühere Kurzseiten-/FAQ-optional-Hinweise sind für neue Generierungen überholt. Die zusätzlichen Prüfprotokolle liegen in `docs/authored-full-qa/`.
