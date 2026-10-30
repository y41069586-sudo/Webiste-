# Vier Betriebsabnahmen – 30.10.2026

Bestehendes V4/V5-System; Steuerstatus ausdrücklich unbestätigt. Keine §19-/USt-Angabe erfinden.
DRY_RUN=true, kein Kundenbrief, keine echte Zahlung, keine Domainbestellung. Die ausdrückliche
Freigabe „Ja push und veröffentlich“ gilt für geprüfte Änderungen; VPS bedient der Betreiber selbst.

| Strecke | Tatsächlicher Nachweis | Offen |
|---|---|---|
| Stripe | Website-Sandbox verbunden; vorhandene Preise 597/19/99 und aktiver Webhook an dynamischer App erneut gelesen. PAYMENT_PROVIDER=stripe in Netlify gespeichert, Standardmodus test. | Hosted-Kauf beider Tarife, signierte Verarbeitung und Monatsstart nach tatsächlichem Go-Live. Neue ENV erst nach Deploy wirksam. |
| Mail/Onboarding/Domain | Resend-Domain verifiziert, bestehende Adapter erhalten. Seitenwerk.world vorhanden, Netlify-DNS. | Mailfluss noch mock. Hosting-Token fehlt. Vorhandene Domain ersetzt keinen Registrar-Test für neue Kundendomains. |
| Backup/Restore | Lokaler PostgreSQL-Dump und Restore in separatem Container ohne Netzwerk; identische Inhaltsfingerprints. Neue Storage-Restore-CLI prüft Binärdaten/Korruption. | Noch kein auf dem VPS ausgeführter Supabase-/S3-Gesamtrestore. Lokaler Lauf setzt keinen produktiven backup_status. |
| Recherche | Offene OSM-Kandidaten nachrecherchiert; Yalcin hat eigene Website, Malz-Datensatz überholte Identität. Weiterer aktiver Reinigungsbetrieb hat ebenfalls eigene Website. | Kein Mindestkriterien vollständig erfüllender echter Betrieb abgenommen. Keine generische Demo zur künstlichen Erfüllung erzeugt. |

## Implementierung

- `queue:prepare --apply --queues-only`: fehlende Queues im installierten pg-boss ergänzen, ohne
  Migrationen/Seeds. Tatsächlich fehlen research-lead und revise-demo. Test erhält bestehende Jobs,
  Migrationenzahl und Schemaversion.
- `storage:backup restore-local`: Hashprüfung vor Anlage eines neuen Restore-Ziels; bestehendes Ziel
  niemals überschreiben. Quelle nur lesen, kein Remote-PUT/DELETE.
- `infra/backup/managed-acceptance.sh`: private Worker-Verbindung, Dump, isolierter DB-Restore und
  Inhaltsvergleich, S3-Snapshot plus lokaler Objekt-Restore. Optional erst danach fehlende Queues
  ergänzen. Kein automatischer grüner Betriebsstatus.
- `backup-connection.ts`: verifiziertes TLS, 0600-Dateien, keine Zugangsdaten in Ausgabe. Fehlende
  SELECT-/RLS-Rechte blockieren Vollbackup. BACKUP_DATABASE_URL darf privat auf dem VPS eine
  berechtigte Verbindung derselben DB liefern. App-Rolle nicht hochstufen, RLS nicht abschalten,
  niemals --enable-row-security als vermeintlich vollständiges Backup einsetzen.
- Vorhandener Worker-Einmal-Code exportiert nun NETLIFY_API_TOKEN; NETLIFY_AUTH_TOKEN bleibt
  ausgeschlossen. Keine beliebigen Konto-Secrets exportieren.

## Prüfungen dieser Fortsetzung

- 10/10 Tests in fünf Dateien bestanden: Storage-Hash/Restore/Korruption, Queue mit Joberhalt,
  private Backup-Verbindung und Sperre eingeschränkter Rolle, Bootstrap/parallel eingelöster Code.
- Gesamter Workspace-Typecheck, gezieltes ESLint und Bash-Syntax bestanden.
- 28/28 zusätzliche bestehende Stripe-/Hosted-Checkout-/Abo-Lebenszyklus-Regressionen bestanden
  (lokale Testdatenbank und Fake-Transport, kein echter Stripe-End-to-End-Nachweis).
- Vollständiger Produktionsbuild bestanden, einschließlich Worker-TypeScript. Unveränderte
  Warnungen aus Template-Fotoimporten und pnpm-Childprozess; kein Buildfehler.
- Lokaler vollständiger DB-Restore nach Korrektur der Docker-Dateirechte bestanden. Dieser Lauf
  schloss bewusst kein produktives S3 ein; Storage-Restore separat lokal getestet.
- Erster Testaufruf scheiterte an Sandbox-Netzrechten; korrekter isolierter Wiederholungslauf grün.
  Keine Prüfungen gegen Produktionsdatenbank und kein Supabase-Testreset.

## Hosting-Secret im bestehenden Netlify-Projekt

1. User settings → Applications → Personal access tokens: Hosting-Test-Token anlegen.
2. Projekt `seitenwerkworld` → Project configuration → Environment variables.
3. NETLIFY_API_TOKEN als Secret, Production-Kontext, Functions-Scope hinterlegen.
4. Nach App-Deploy regulären Worker-Einmal-Code verwenden. Token nie im Chat/Git/NEXT_PUBLIC_.

Testziel: test.seitenwerk.world. Root-Domain/Firmenwebsite erhalten. Kein Domainkauf. Ein Token
allein aktiviert weder Hosting-Provider noch automatische Kundenseiten-Veröffentlichungen.

## VPS-Prüfung nach Veröffentlichung

Neuen Worker-Code im Admin erzeugen, bekannten Setup-Aufruf mit NEU=1 LIVE=0 ausführen.
Die App-Rolle seitenwerk_admin_backend ist weder Tabelleninhaber noch BYPASSRLS; für Vollbackup
privat BACKUP_DATABASE_URL mit berechtigter Supabase-Rolle derselben DB setzen. Keine Geheimnisse
im Chat. Im vorhandenen Verzeichnis /opt/seitenwerk anschließend:

```bash
PREPARE_MISSING_QUEUES=1 bash infra/backup/managed-acceptance.sh
```

Noch kein Nachweis eines VPS-Laufs. Bei geänderten Quelldaten keine Abnahme; in ruhiger Pipeline
wiederholen. Für Dauerbetrieb fehlen zusätzlich Aufbewahrung, externe geschützte Backup-Kopie
und wiederkehrende Restore-Probe.

## Tatsächliche Veröffentlichung und erster Hosted-Kauf

- Commit 332e31ab691b14e92bfe9067c45897982941129c auf beiden vorhandenen Zweigen gepusht.
  Netlify production 6ae4717e871b678339e4d7e7, ready, veröffentlicht 10:30:15 UTC.
  Laufzeit: DRY_RUN=true, PAYMENT_PROVIDER=stripe, Testschlüssel lesend HTTP200, S3 erreichbar.
- Basis über normale Demo → Tariflink → Stripe Hosted Checkout mit 4242-Testkarte bezahlt.
  Nur fiktive Käuferdaten, eigenes Supportpostfach. Bestellung 4991f35d-0c23-465f-b4b1-0f320d5a5f91,
  payment_mode=test, amount=59700, status=paid, Kunde angelegt. Signierter Webhook
  evt_1UWD6TGn2A630LhHaO8D5AfZ tatsächlich verarbeitet. Kein Monatsabo vor Go-Live.
- Erfolgsseite und persönliches Onboarding mobil tatsächlich geöffnet, kein horizontaler Überlauf.
  Bestätigungs-/Rechnungsmail jedoch nur Mock-Postausgang; keine echte Zustellung behaupten.
- Echter Test deckte noch gesetzten §19-Standardhinweis trotz unbestätigtem Steuerstatus auf.
  Neue Rechnungen übernehmen diesen Hinweis jetzt ausschließlich bei bestätigtem Kleinunternehmer-
  Status. Drei Rechnungs-PDF-/Snapshot-Tests bestanden, darunter Erhalt alter Rechnungsstände.
  Der erste gespeicherte Testbeleg bleibt unverändert und ist kein gültiger Produktivrechnungsnachweis.
- Veraltete Beschreibung des vorhandenen Sandbox-Einrichtungsprodukts korrigiert: Monatsbeginn
  nach bestätigtem Go-Live und ausdrücklicher Tarifzustimmung. Nur Beschreibung im Sandbox-Produkt;
  kein neuer Preis und keine Live-Katalogänderung.
- Zweiter fiktiver Testlauf über vorhandenen Admin angelegt. Technische Demo-QA bestanden,
  Lighthouse des tatsächlichen Worker-Laufs:99/100/100/100. Desktop1440/Mobil390 gerendert und
  tatsächlich angesehen; alle Bilder nach Lazy-Load geladen, kein Überlauf. Keine externe Design-
  oder Kundenabnahme und keine allgemeine Premium-Bewertung daraus ableiten.

## Zweiter Hosted-Kauf und gefundene Test-/Echtbetrieb-Verwechslungen

- Care+ ebenfalls über echte Stripe-Sandbox und 4242 bezahlt. Bestellung
  c7e74a8b-1b06-4809-8680-951b014919e6, 59700 EUR, payment_mode=test, status=paid,
  gespeicherter Monatstarif 9900 Cent. Signierter Webhook evt_1UWDHxGn2A630LhHBBib9rtt verarbeitet.
  Die neue Rechnung hat taxNote=null; Betreiber-Steuerbestätigung unverändert false.
- Beide abgeschlossenen Sessions zusätzlich direkt bei Stripe gelesen: paid, livemode=false,
  jeweils 59700 EUR, Unternehmens-/AGB-Felder ja, setup_future_usage=off_session, Zahlungsmittel
  dem jeweiligen Stripe-Kunden zugeordnet. Noch kein Abo, keine Monatszahlung. Positive reale
  Sandbox-Abostartprüfung bleibt bis tatsächlicher Test-Veröffentlichung offen.
- Basis-Onboarding tatsächlich mit fiktiven Angaben übermittelt und private Kundenvorschau gebaut.
  Ein zu kurzer Prüf-Datenschutztext wurde korrekt zurückgewiesen; anschließend ausreichend langer,
  ausdrücklich als fiktiv markierter Prüftext verwendet. Keine juristisch freigegebene Kundenseite.
- Erfolgsseite kennzeichnet Testbestellungen anhand des gespeicherten Zahlungsmodus und verspricht
  bei Mock-E-Mail keinen tatsächlichen Versand mehr. Interner Mock-Status „sent“ bleibt vom echten
  Zustellnachweis getrennt. Kein Umbau des bestehenden Checkout-/Webhook-Flusses.
- Betriebsfunnel schließt Mock-Leads/-Demos sowie Test-/Mock-Go-Lives und Test-Tarifwechsel aus.
  Reale Zahlungen bleiben auf payment_mode=live/provider=stripe begrenzt. Vorher konnten Test-
  Websites unabhängig vom Bestellmodus als Go-Live gezählt werden; dies ist gezielt behoben.
- 23/23 Checkout-/Funnel-Tests bestanden. Ein alter §19-Test verwendete unbestätigte Standardwerte;
  Fixture nun ausdrücklich bestätigt, statt den Wahrheitscheck zurückzunehmen. Keine Prod-Steueränderung.
- Zwei Browser-E2E gegen Produktionsbuild bestanden: kompletter bestehender lokaler V4-Mockfluss
  bis Onboarding, Mock-Veröffentlichung, Monatsstart, Wechsel/Kündigung sowie Firmenpreise.
  Zusätzlich Test-/Nichtzustellhinweise geprüft. Dieser lokale Monatsstart ist **kein** tatsächlicher
  Stripe-Abostart nach echtem Hosting. Gesamter Typecheck, gezieltes ESLint und Web-Build bestanden.

Sicherer externer Nachweis: [Stripe-Testkäufe](stripe-sandbox-purchases.json). Vollständige Checkout-/
Onboardingbilder und private Links ausschließlich unter ignoriertem data/activation-2026-10-30/.
Nach zusätzlicher reiner Wortlautkorrektur der Nichtzustellmeldung kein erneuter lokaler Vollbuild;
der folgende Netlify-Build prüft den endgültigen Veröffentlichungsstand.

Unverändert offen: echte Resend-App-Zustellung, Hosting-Token/Testsubdomain, Registrar-Sandbox,
positiver tatsächlicher Stripe-Monatsstart, VPS-Backup/Restore/Queue-Ergänzung und vollständiger
geeigneter echter Recherche-/Demo-/Briefkontrollfall. Kein Go-Live aller vier Aufgaben behaupten.

## Endstand dieser Fortsetzung

Finaler App-Code a0aee999858bc33cf2d69eee62d708f73674d9c9 veröffentlicht: Netlify production
6ae476fdd4ef7bebeb529dce, ready, 10:53:37 UTC. Secretscan ohne Treffer. Beide tatsächlichen
Sandbox-Erfolgsseiten anschließend mit390px erneut gerendert: Testhinweis/Nichtzustellhinweis
korrekt, persönlicher Onboardinglink vorhanden, kein Überlauf. Laufzeit Stripe/test und DRY_RUN=true.
DB-Dry-Run ebenfalls true, Steuerbestätigung false, Empfängerversandfreigabe false. Fehlende Queues
weiter nicht angelegt. Vorhandene Firmenwebsite/Root-Domain unverändert.

Nachweis: [Finaler Deploy/Laufzeit](final-readiness-deployment.json). Insgesamt64 gezielte Core-Tests
in den dokumentierten Läufen sowie2 lokale Produktions-Browser-E2E bestanden; kein aktueller
ungekürzter Volltest aller Projekttests behauptet. Zwei echte Stripe-Sandbox-Zahlungen davon getrennt.
VPS-Version/Providerumgebung nach diesen Änderungen noch nicht aktualisiert nachgewiesen;
nach Hosting-Secret und neuer App-Veröffentlichung regulären Einmal-Code mit NEU=1 LIVE=0 übernehmen.
Die normale Admin-Sitzung wird abgemeldet; lokale temporäre Zugangskopien werden entfernt.
Diese abschließende Dokumentationssicherung trägt Skip-Markierungen, kein weiterer App-Deploy.

## Hosting-Secret: Laufzeitprüfung nach Betreiber-Screenshot

Betreiber zeigt NETLIFY_API_TOKEN mit Schloss und vier gespeicherten Kontextwerten. Der verbundene
Netlify-Metadatenabruf zeigt den Schlüssel weiterhin nicht; den Screenshot deshalb nicht erneut
als fehlerhafte Eingabe behandeln. Bestehenden geschützten GET /api/admin/integrations um eine
lesende Netlify-Laufzeitprüfung ergänzt: konfiguriert ja/nein, Provider und HTTP-Status eines GET
auf das aktuelle Projekt. Kein Tokenwert, kein Upstream-Payload, keine Projekt-/DNS-Mutation und
kein Umschalten des Hosting-Providers. Erst tatsächlicher Laufzeitabruf bestätigt die Verbindung.

Ursache danach eindeutig gefunden: der tatsächliche geschützte Schlüssel heißt NELITFY_API_TOKEN
(vertauschte Buchstaben), nicht NETLIFY_API_TOKEN. Projekt seitenwerkworld ist richtig. Neue kompatible
Env-Auswertung übernimmt genau diesen vorhandenen Alias, ohne ihn offenzulegen; ein korrekt
gesetzter NETLIFY_API_TOKEN hat Vorrang. Regulärer Worker-Einmal-Code exportiert ausschließlich den
kanonischen Namen. Kein geheimer Wert aus der Metadaten-API rekonstruiert oder ins Workspace übertragen.
Das Vorhandensein des Tokens schaltet Hosting, DNS oder echte Geschäftsaktionen nicht automatisch frei.

Verbindungsprüfung nach Alias-Korrektur tatsächlich bestanden: Netlify HTTP200, Token vorhanden,
Provider mock, DRY_RUN=true. Siehe hosting-connection.json. Begrenzter Probelauf auf dem vorhandenen
VPS ist implementiert und lokal auf Schutzmechanismen geprüft; externe Ausführung bleibt ausstehend.
Genaue Befehle und Grenzen: hosting-acceptance.md. Worker benötigt reguläre neue Zugangskonfiguration;
keinen Bootstrap-Code außerhalb der vorgesehenen VPS-Einrichtung zum Secret-Auslesen verwenden.

## VPS-Hosting-Probelauf tatsächlich bestanden; Kundenstart weiterhin offen

Betreiber hat den bestehenden Worker auf03734a1 aktualisiert und den begrenzten Hosting-CLI ausgeführt.
Audit 11:39:58 UTC: HTTPS-Inhalt stimmt exakt, Root-Website unverändert. Unabhängiger HTTP-/Netlify-
Readback und Browser1440/390 bestätigen Veröffentlichung, gültiges TLS, eingebettete Fonts ohne
Ladefehler, kein horizontaler Überlauf, noindex, keine JavaScriptfehler/aktiven Formular-Submits.
[Maschinenlesbarer Nachweis](hosting-publication.json). Die ältere Meldung „VPS noch nicht ausgeführt“
ist damit für diesen Hosting-Probelauf überholt, nicht für Backup/Restore/Queue-Ergänzung.

Beide tatsächlichen Stripe-Sandbox-Bestellungen weiterhin paid, billingStartedAt/subscriptionId=null.
Kundenseite weiter preview/liveAt=null. Rechnungsmails nach Datenbank-Readback nur mock/sent, kein
Resend-Zustellnachweis; research-lead und revise-demo weiterhin nicht in pgboss.queue vorhanden.
Steuerstatus unverändert unbestätigt und DRY_RUN=true. Kein Go-Live für echte Kunden erklärt.

Gezielter nächster Schritt: vorhandene Care+-Bestellbestätigung mit Original-PDF/Onboarding-Link
über bestehenden Resend-Adapter ausschließlich ans eigene Postfach. CLI vorbereitet und mit fünf
neuen Sicherheitstests, sechs bestehenden Provider-Fake-Transporttests und einem vorhandenen
Mail-Wiederholungs-/Doppelversandtest geprüft (12bestanden,4andere Failuretests nicht ausgewählt).
Core-TypeScript und gezieltes ESLint bestanden. Keine Mail in diesen Tests versendet. Einzelheiten
und begrenzter VPS-Aufruf: [email-acceptance.md](email-acceptance.md).

## Eigene Bestätigungsmail tatsächlich zugestellt; Spam als neuer offener Befund

Betreiber hat den CLI72be5ac auf dem VPS ausgeführt. Resend API-Annahme13:42:03UTC, tatsächlicher
Eingang13:42:10UTC mit identischer Message-ID, Status delivered. PDF149144Bytes mit identischem
Hash zum unveränderten Originalbeleg aus dem App-Audit; gültiges PDF/MIMEapplication/pdf, korrekte
Testkennzeichnung und Einrichtung597€, kein unbestätigter §19-Hinweis. Care+ insgesamt99€/Monat
und Monatsstart nach bestätigtem Go-Live im empfangenen Inhalt korrekt.

Privaten Onboarding-Link aus empfangener Mail in390px tatsächlich geöffnet und Screenshot angesehen:
HTTP200, kein Login/Überlauf/JS-Fehler, richtiges Käufer-Firmenfeld. Keine Formulareingabe abgeschickt.
Kein zusätzlicher Monatsstart/Go-Live oder globaler Mail-Providerwechsel; historische Mock-Zeilen erhalten.

**Nachricht liegt im Spam-Ordner.** Domain/DKIM/SPF bei Resend verified; kein behaupteter DMARC- oder
externer Inbox-Nachweis. Rohmail ohne Authentication-Results-/Spam-Verdict-Header, Ursache unbekannt.
Keine DNS-/Ordneränderung oder zweite Mail ausgelöst. Tatsächlicher Transport ist nachgewiesen,
Kunden-Zustellbarkeit weiterhin offen. Nachweis [email-delivery.json](email-delivery.json).
Nur Dokumentationsänderung; keine erneuten Code-Tests nötig und kein App-/Worker-Deploy.
