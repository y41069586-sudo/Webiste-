# INWX-Produktion für bezahlte Kundenaufträge freigegeben

Der Betreiber hat am 31.10.2026 ausdrücklich der dauerhaften INWX-Produktionsumschaltung
zugestimmt, damit nach bezahlten Kundenbestellungen kostenpflichtige Domains registriert werden
können. Diese konkrete Zustimmung ersetzt die zuvor fehlende Freigabe; keine allgemeine
Versand-, Zahlungs- oder Worker-Startfreigabe. Zustimmung als privates Setting und Audit erfasst.

In der bestehenden Netlify-App sind im Production-Kontext nun REGISTRAR_PROVIDER=inwx und
REGISTRAR_ENV=production gespeichert. Andere Kontexte und Zugangsdaten nicht geändert.
Wirksamkeit nach dem folgenden App-Deploy prüfen. Keine Domain wurde dabei gekauft und keine
INWX-Anmeldung wiederholt. Der bestandene Produktions-Lesetest bleibt gültig.

Vor einem echten Registrar-Kauf verlangt die Abwicklung jetzt zusätzlich eine gespeicherte
Stripe-Live-Bestellung: status=paid, tatsächlicher Zahlungszeitpunkt und PaymentIntent,
positiver Betrag, keine ausstehende/bereits erfolgte Erstattung und kein Vertragsende.
Die Prüfung läuft vor Hosting-Schritten und erneut unmittelbar vor der Registrierung;
Zahlungsänderungen während langsamer Hosting-Anfragen werden erneut erkannt.
DRY_RUN, Not-Aus und bestehende einzelne Domainkauf-Freigabe bleiben weitere Voraussetzungen.
Die allgemeine autoRegisterDomains-Einstellung wurde nicht eingeschaltet.

Auf dem VPS darf die bestehende private Datei mit dem ausdrücklichen Flag --inwx-production
vorbereitet werden. Vorhandene INWX-Zugangsdaten werden verlangt, aber nicht ausgegeben.
Eine spätere normale Vorbereitung erhält eine bereits konfigurierte Produktionsauswahl.
Compose überschreibt die private REGISTRAR_ENV nicht mehr fest mit sandbox; ohne private
Angabe bleibt der sichere Code-Standard sandbox. DRY_RUN bleibt im Compose ausdrücklich true.
Das Image kann gebaut werden, ohne den pausierten Worker zu starten.

## Prüfungen und Grenzen

- Alle bisherigen 20 Onboarding-Tests einschließlich neuer Sperrfälle bestanden; zusätzlicher
  Test erkennt eine erst während des Hosting-Schritts begonnene Erstattung. Drei passende
  INWX-Adaptertests ebenfalls bestanden; kein echter Providerkauf aus Tests.
- Vier lokale Python-Tests: Credentials bleiben unverändert, fehlende INWX-Daten blockieren,
  Test-Zahlungsmodus und DRY_RUN bleiben erhalten, normale Wiederholung erhält Produktion.
- Tatsächliches Docker-Compose-Config-Rendering mit fiktiver privater Datei bestätigt
  REGISTRAR_ENV=production bei gleichzeitig DRY_RUN=true und ALLOW_REAL_LETTERS=false.
- Workspace-Typecheck, ESLint und App-/Worker-Build bestanden.

Die vorher offene Kontrollstrecke ist inzwischen als App-Version 4b39524 veröffentlicht:
Netlify 6ae5e39538428cc0f08fa842, production/ready, 31.10.2026 um 12:49:21 UTC.
Diese Bereitstellung entstand vor der neuen INWX-Einstellung und enthält die zusätzlichen
Kauf-Sperren noch nicht. Den folgenden Deploy gesondert prüfen; privater Ergebnisnachweis unter
data/activation-2026-10-31/inwx-production-readback.json, falls bereits vorhanden.

Der VPS hat noch keinen nachgewiesenen Konfigurations-/Image-Abgleich für diese Änderung.
Keine tatsächliche Domainregistrierung und keine Abnahme eines Registrierungsablaufs behaupten.
Stripe bleibt test, Worker pausiert, Empfängerbriefe gesperrt. Steuer-/Rechnungsdaten werden durch
diese Providerfreigabe nicht bestätigt.
