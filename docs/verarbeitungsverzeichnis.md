# Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) – Entwurf

> Entwurf zur Prüfung durch dich bzw. deine Datenschutzberatung. Technische Angaben (Daten, Fristen,
> Löschwege) entsprechen dem Code (Stand 23.10.2026). Rechtliche Bewertungen sind zu prüfen.

**Verantwortlicher:** {Name, Firma, Anschrift aus Einstellungen → Absender}, E-Mail {Absender-E-Mail}.
**Datenschutzbeauftragter:** nicht bestellt (prüfen, ob Pflicht nach § 38 BDSG besteht – i. d. R. nein).

Allgemeine technische und organisatorische Maßnahmen (TOM): Server in Deutschland (Hetzner), TLS für
alle Verbindungen, Admin-Zugang nur mit Passwort + TOTP und Ratenbegrenzung, Secrets nur in `.env`,
Logs ohne personenbezogene Daten, keine vollständigen IP-Adressen (nur täglich wechselnder Hash),
keine Tracking-Cookies, tägliche verschlüsselt zu verwahrende Backups mit Wiederherstellungstest,
Audit-Log für alle Statuswechsel und Löschungen, Löschfristen automatisiert (nächtlicher Lösch-Job).

---

## 1. Lead-Recherche und Werbebrief an Betriebe

|                 |                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zweck           | Ansprache lokaler Betriebe ohne Website per Brief (Direktwerbung), Erstellung eines Website-Entwurfs                                                                                           |
| Betroffene      | Inhaber/Betreiber lokaler Betriebe (häufig Einzelunternehmer = natürliche Personen)                                                                                                            |
| Daten           | Firmenname, Geschäftsanschrift, Geschäftstelefon, Öffnungszeiten, Branche, Website-Link (falls vorhanden), ggf. Bewertungsdurchschnitt/-anzahl (nur flüchtig, siehe compliance-google.md)      |
| Quelle          | OpenStreetMap (ODbL), optional Google Places im erlaubten Umfang; Hinweis im Brief nach Art. 14 DSGVO                                                                                          |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Direktwerbung, ErwG 47); Briefwerbung an Gewerbetreibende ohne Einwilligung zulässig, solange kein Widerspruch vorliegt (§ 7 Abs. 1 UWG) |
| Empfänger       | Briefdienstleister (Druck und Versand), KI-Anbieter (Texterstellung ohne Personenbezug außer Firmenname), Hosting der Entwürfe (eigener Server)                                                |
| Löschfrist      | Entwurf: Ablauf nach 30 Tagen (+ Verlängerung bei Folgebrief); Lead-Daten: 6 Monate nach dem letzten Brief anonymisiert (Kontakt-Sperre bleibt als Hash + Datum für 12 Monate)                 |
| Widerspruch     | QR-Seite „Kein Interesse“, E-Mail, Post, Telefon → sofortige Sperre, Entwurf und Daten gelöscht, nur Hash in der Sperrliste                                                                    |

## 2. Tracking der Entwurfsseiten

|                 |                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Zweck           | Messung, ob ein Brief angekommen ist und genutzt wird (Scan, Aufruf, Klick)                        |
| Daten           | Ereignis am Lead (Zeit, Typ), gekürzter Gerätetyp, täglich wechselnder IP-Hash (Duplikaterkennung) |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO; keine Cookies, kein Zugriff auf Endgeräte (§ 25 TDDDG nicht berührt)   |
| Löschfrist      | IP-Hash und Gerätetyp nach 30 Tagen entfernt; Ereignisse ohne diese Angaben bleiben für Kennzahlen |

## 3. Fragen über das Formular der Entwurfsseite und E-Mail-Support

|                 |                                                                                 |
| --------------- | ------------------------------------------------------------------------------- |
| Zweck           | Beantwortung von Anfragen, Umsetzung von Widersprüchen                          |
| Daten           | Name, E-Mail, ggf. Telefon, Nachricht; Klassifizierung und Antwortentwurf       |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b (vorvertraglich) bzw. lit. f DSGVO                         |
| Empfänger       | E-Mail-Dienstleister, KI-Anbieter (Klassifizierung/Entwurf)                     |
| Löschfrist      | Nachrichten ohne Kundenbezug nach 12 Monaten; Versand-Metadaten nach 24 Monaten |

## 4. Bestellung, Zahlung, Rechnung

|                 |                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Zweck           | Vertragsschluss (nur B2B), Zahlungsabwicklung, Rechnungsstellung                                                                                                               |
| Daten           | Firma, Ansprechpartner, Rechnungsanschrift, E-Mail, Telefon, Wunschdomain, Zahlungsreferenzen (keine Kartendaten – verbleiben bei Stripe), Bestätigung B2B/AGB mit Zeitstempel |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO; Aufbewahrung Art. 6 Abs. 1 lit. c i. V. m. § 147 AO, § 257 HGB                                                                                     |
| Empfänger       | Stripe (Zahlung), E-Mail-Dienstleister (Rechnungsversand), Steuerberatung                                                                                                      |
| Löschfrist      | Abgebrochene Bestellungen nach 6 Monaten; Rechnungen und Buchungsdaten 10 Jahre (Config), danach anonymisiert                                                                  |

## 5. Erstellung und Betrieb der Kunden-Website, Domain

|                 |                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zweck           | Vertragserfüllung: Website, Domainregistrierung auf den Kunden, Hosting, Kontaktformular-Weiterleitung                                                     |
| Daten           | Impressumsangaben, Datenschutztext des Kunden, Texte, Logo/Fotos (Metadaten entfernt), Öffnungszeiten, Kontaktdaten; Domain-Inhaberdaten (Registrar/DENIC) |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO                                                                                                                                 |
| Empfänger       | Registrar (INWX) und Registry (DENIC), Hosting (Cloudflare oder Netlify), E-Mail-Dienstleister                                                             |
| Löschfrist      | Mit Vertragsende und Ablauf der Aufbewahrungsfristen; Uploads werden beim Anonymisieren gelöscht                                                           |

## 6. Kontaktformular auf den Kunden-Websites (wir als Auftragsverarbeiter des Kunden)

|             |                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Zweck       | Weiterleitung von Anfragen der Website-Besucher an den Kunden                                                                            |
| Daten       | Name, E-Mail, Telefon (optional), Nachricht                                                                                              |
| Rolle       | Auftragsverarbeitung nach Art. 28 DSGVO für den Kunden → **AV-Vertrag mit jedem Kunden nötig** (Vorlage in die AGB/Onboarding aufnehmen) |
| Speicherung | Inhalt wird nicht gespeichert, nur per E-Mail weitergeleitet; Versand-Metadaten (Empfänger, Betreff) bis 24 Monate                       |

## 7. Admin-Zugang und Protokollierung

|            |                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Daten      | Admin-E-Mail, Passwort-Hash (scrypt), TOTP-Secret (verschlüsselt), Sitzungen, Audit-Log (ohne Klartext-PII) |
| Löschfrist | Sitzungen nach Ablauf; Audit-Log dauerhaft (enthält keine Klartextdaten Dritter)                            |

---

### Offene Punkte für dich

- Datenschutzerklärung der eigenen Seiten (Impressum, Datenschutz, AGB) liefern und im Dashboard hinterlegen.
- AV-Verträge mit allen Dienstleistern abschließen (siehe [auftragsverarbeiter.md](auftragsverarbeiter.md)).
- AV-Vertrag für das Kontaktformular der Kundenseiten in AGB/Onboarding aufnehmen.
- Interessenabwägung zur Briefwerbung dokumentieren (Vorlage: Abschnitt 1).
