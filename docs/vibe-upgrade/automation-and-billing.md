# Betriebscharakter: Belegregel und VPS-Ablauf

Aktualisierung 27.10.2026, Ausgangscommit `12ad382`, Branch `codex/conversion-v4`.
Neuer Betreiberauftrag: vorhandene Stilautomatisierung muss den tatsächlichen Betriebscharakter
beachten; bei unzureichender Information keine solche Anpassung behaupten oder erzwingen.

## Tatsächliche Änderung

Der vorhandene Workerpfad `build-demo → resolveBusinessDesign` verwendet einen ergänzten
Analyseprompt und ein typisiertes Ergebnis mit getrennten Beobachtungen:

- Farben/Materialwirkung;
- erkennbare Typografie/Beschilderung;
- Atmosphäre/Bildsprache;
- Komposition.

Unbekanntes muss `null` bleiben. Firmenname, Branche, Leistungen, Standardpalette und ein
beliebiges Beispielfoto sind keine Belege für die visuelle Identität eines konkreten Betriebs.
Die KI muss außerdem ausdrücklich angeben, ob die Informationen ausreichend sind. Ein komplettes
Stilprofil wird nur übernommen, wenn dies bestätigt ist, mindestens zwei unterschiedliche
Dimensionen beschrieben sind und die Einschätzung nicht als unsicher (`low`) markiert ist.
Das ist ein technisches Mindestkriterium, kein Beweis objektiver Designqualität oder Faktentreue.
Die bestehende individuelle manuelle Freigabe bleibt erforderlich.

Unbekannte Originalfarben werden auch bei sonst ausreichenden Belegen nicht aus der Modellantwort
übernommen; nicht belegte Typografie und Komposition behalten den allgemeinen Gestaltungsvorschlag.
Eine vorgeschlagene Schrift ist damit keine Behauptung über die tatsächliche Originalschrift.
Bei unzureichendem/unsicherem Befund bleibt `industry_proposal` und ein konkreter Prüfhintergrund
im bestehenden privaten Cache. Ein einzelner belegter OSM-Farbhinweis bleibt wie bisher separat
`source_hint`, keine umfassende Foto-/Vibeanalyse. Keine Referenzen: keine Stilmodell-Anfrage.

Der interne Analyse-Cache wurde versioniert, sodass alte Antworten ohne diese Belegfelder nicht
für neue Generierungen als ausreichend wiederverwendet werden. Bestehende gespeicherte Demos
und Briefe werden nicht still neu gerendert. Keine neue Tabelle, Migration oder Providerarchitektur.

## Was auf dem VPS läuft

Der vorgesehene VPS betreibt den vorhandenen Node-/Chromium-Worker und seine pg-boss-Jobs.
Er führt Projektcode aus; diese Chat-Unterhaltung oder ein dauerhaft angemeldetes ChatGPT laufen
dort nicht. Quellenprüfung, Demo, QA, Brief und Freigaben bleiben getrennte Verarbeitungsschritte.

Der Lead-Finder verwendet die vorhandenen zulässigen Quellen. Die Stilprüfung verwendet die
im bestehenden privaten Admin-/Settings-/Storagepfad bereitgestellten, zugeordneten und berechtigten
Referenzen/Stilnotizen. Sie sucht nicht selbständig mit den ChatGPT-Webtools nach beliebigen Fotos.
Die vollständige automatische Beschaffung solcher Bildreferenzen ist weiterhin nicht umgesetzt.
Fehlende Belege werden nicht durch Branchenwissen als Betriebsfakten ersetzt. Rechte zur
Speicherung/Analyse und zur späteren Bilddarstellung bleiben getrennt.

Ist `LLM_PROVIDER=anthropic` mit sicher gebundenem Schlüssel eingerichtet, gehen Text-/Bildanalyse,
Demo- und Brieftexte sowie aktivierte KI-Prüfungen über den vorhandenen Anthropic-API-Provider.
Der bestehende Budgetdienst prüft vor Aufrufen und bucht die gemeldeten Tokenkosten. Cachetreffer
vermeiden eine erneute Stilanfrage. Bei `mock` sind Antworten Testdaten und keine echte KI-Abnahme.

## ChatGPT-Kontingent und Kosten

Die bestehende VPS-Architektur verwendet keinen ChatGPT-Login und keine ChatGPT-Plus-Zuteilung.
Sie beansprucht daher kein Plus-/Codex-Kontingent. Die Entwicklungsarbeit hier im Chat unterliegt
dagegen dem jeweils geltenden ChatGPT-/Codex-Kontingent.

Der Worker verursacht VPS-Miete und bei echten Aufrufen gesonderte API-Nutzungskosten. Die
vorhandene Implementierung nutzt Anthropic; auch ein ChatGPT-Plus- oder Claude-Chatabo umfasst
diesen API-Verbrauch nicht. Ein wartender Worker verbraucht keine Modell-Tokens, die Servermiete
läuft unabhängig davon weiter. Keine konkreten Pro-Lead-Kosten ohne gemessene Aufrufe behaupten.

Offizielle Produkt-/Abrechnungsinformationen, am 27.10.2026 gelesen:

- OpenAI: https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus
- OpenAI: https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform
- Anthropic: https://support.anthropic.com/en/articles/9876003-i-subscribe-to-a-paid-claude-ai-plan-why-do-i-have-to-pay-separately-for-api-usage-on-console

## Prüfstand und Grenzen

Neue Regressionen zeigen ausdrücklich: hohe Selbsteinschätzung trotz unzureichender Belege,
einzelner Farbhinweis und niedrige Sicherheit dürfen kein vollständiges Betriebsprofil erzeugen.
Fehlende Originalfarben/-schriften bleiben auch bei anderen passenden Stilbeobachtungen offen.
Vorher scheiterten zwei neue negative Fälle; Ergebnisse des korrigierten Stands werden in
`style-evidence-verification.json` festgehalten.

Nur lokale Tests, isolierte Datenbank, alle sieben Provider Mock, `DRY_RUN=true`. Keine echte
Bildanalyse, Modellkosten, Kontakte, Briefe, Zahlungen, Migrationen, VPS-Bereitstellung oder
Veröffentlichung in diesem Arbeitspaket. Der VPS ist damit nicht automatisch betriebsbereit.

VERIFIED: 46 Coretests in fünf relevanten Suiten bestanden (inklusive Demo-/Brief- und Onboardingpfad),
TypeScript und Lint bestanden, kompletter Web-/Workerbuild bestanden. Sieben bekannte dynamische
Tracingwarnungen bleiben. Neue negative Regelfälle vor Änderung tatsächlich reproduziert, anschließend
bestanden. Konsolidierte Metadaten und Logreferenzen: `style-evidence-verification.json`;
relevante Testlogs: `style-evidence-before.txt` und `style-evidence-core.txt`.
