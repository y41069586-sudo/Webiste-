import type { AppConfig } from '../config/settings';
import { v4PriceText } from '../services/offers-v4';
import { bm25 } from './text';

/**
 * Projekt-Wissen für den Assistenten (ohne KI). Jede Antwort liest aktuelle Werte aus der Konfiguration, damit
 * Preise, Grenzen und Fristen stimmen. Quelle: CLAUDE.md, AGENTS.md, docs/entscheidungen.md, docs/integrations.md.
 * Keine Rechtsberatung: rechtliche Punkte verweisen auf die Rechtstexte und die Go-Live-Checkliste.
 */
export interface KnowledgeEntry {
  id: string;
  title: string;
  /** Synonyme und typische Fragewörter */
  keys: string;
  text: (cfg: AppConfig) => string;
  links?: { href: string; label: string }[];
}

const eur = (cents: number) =>
  `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'geschaeftsmodell',
    title: 'Wie funktioniert SeitenWerk (Geschäftsmodell)?',
    keys: 'geschäftsmodell idee projekt konzept wie verdienen ablauf überblick was machen wir worum geht es seitenwerk',
    text: () =>
      'SeitenWerk findet lokale Betriebe ohne eigene Website, baut ihnen automatisch eine fertige Demo-Website und schickt einen persönlichen Brief mit QR-Code zur Demo. Gefällt dem Betrieb die Seite, kauft er sie online ohne Gespräch: Checkout → Onboarding (Impressum, Wünsche) → Vorschau → Go-Live auf seiner eigenen Domain. Du greifst nur bei Freigaben, Sonderfällen und Kundenfragen ein.',
    links: [{ href: '/admin', label: 'Übersicht' }],
  },
  {
    id: 'preise',
    title: 'Was kostet die Website für Kunden (Preise)?',
    keys: 'preis preise kosten kunde angebot tarif basis care plus monatlich einmalig 597 19 99 590 49 abo bezahlen',
    text: (c) =>
      c.offers.activeVersion === 'v4'
        ? `Aktuelles Angebot (V4): ${v4PriceText()} Der Monatsbeitrag startet erst nach bestätigtem Go-Live. Ältere Verträge behalten ihre Preise.`
        : `Angebot: ${eur(c.pricing.packageCents)} einmalig inkl. ${c.pricing.hostingMonthsIncluded} Monaten Hosting oder ${eur(c.pricing.monthlyCents)}/Monat (Mindestlaufzeit ${c.pricing.minTermMonths} Monate), danach ${eur(c.pricing.subscriptionCents)}/Monat.`,
    links: [{ href: '/admin/settings?bereich=money', label: 'Preise & Steuer' }],
  },
  {
    id: 'garantie',
    title: 'Zufriedenheitsgarantie und Erstattung',
    keys: 'garantie zufriedenheit erstattung geld zurück rückerstattung widerruf 14 tage',
    text: (c) =>
      c.guarantee.enabled
        ? `Die Zufriedenheitsgarantie ist an: ${c.guarantee.days} Tage. Erstattet wird per Knopf an der Bestellung (Kunden → Bestellungen); die Seite geht dann offline. Ich löse Erstattungen nicht aus.`
        : 'Wir bieten keine Zufriedenheitsgarantie an. Es gelten nur die gesetzlichen Rechte. Vertrauen schafft die fertige Demo: Der Betrieb sieht seine Website, bevor er etwas kauft.',
    links: [{ href: '/admin/orders', label: 'Bestellungen' }],
  },
  {
    id: 'pipeline',
    title: 'Welche Stufen durchläuft ein Lead (Pipeline/Status)?',
    keys: 'pipeline status stufen zustand ablauf lead lebenszyklus discovered qualified demo_built letter_sent paid live rejected bedeutung',
    text: () =>
      'Gefunden (discovered) → geeignet (qualified) → Demo gebaut → Demo freigegeben → Demo online → Brief erstellt → Brief freigegeben → versendet → zugestellt → gescannt → Kauf-Klick → Checkout → bezahlt → Onboarding → Vorschau freigegeben → live. Daneben: aussortiert (rejected), gesperrt (Widerspruch), abgelaufen, Folgebrief, fehlgeschlagen. Jeder Schritt steht im Protokoll.',
    links: [{ href: '/admin/leads', label: 'Leads' }],
  },
  {
    id: 'leadsuche',
    title: 'Wie funktioniert die Lead-Suche?',
    keys: 'lead suche leadsuche finden suchen betriebe osm openstreetmap karte geofabrik osmium overpass quelle wie funktioniert dauer',
    text: (c) =>
      `Die Suche läuft auf deinem Server: Er lädt höchstens einmal pro Woche die NRW-Karte von OpenStreetMap (Geofabrik), filtert sie nach den Branchen und ordnet jeden Betrieb seiner Stadt zu. Die erste Suche dauert dafür einige Minuten, danach geht es schnell. Kosten: keine. Zielstädte: ${c.targeting.cities.join(', ')}. Wöchentliche Suche montags früh: ${c.segments.weeklyLeadFinder ? 'an' : 'aus'}. Den Fortschritt siehst du live unter Akquise → Lead-Suche.`,
    links: [{ href: '/admin/suche', label: 'Lead-Suche' }],
  },
  {
    id: 'qualifizierung',
    title: 'Wann gilt ein Betrieb als geeignet (Qualifizierung)?',
    keys: 'geeignet qualifiziert qualifizierung kriterien anforderungen aussortiert warum abgelehnt gründe ablehnung filter kette website',
    text: (c) =>
      `Geeignet ist ein Betrieb ohne eigene Website (Social-Media-Links zählen nicht als Website), geöffnet, mit vollständiger Postanschrift in der Zielstadt, nicht auf der Sperrliste, ${c.filters.recontactMonths} Monate nicht kontaktiert, keine Kette, keine ausgeschlossene Branche (Gesundheit/Recht) und mit mindestens ${c.filters.minLeadScore} Vorauswahl-Punkten. Den Grund einer Ablehnung siehst du am Lead.`,
    links: [{ href: '/admin/leads?status=rejected', label: 'Aussortierte Leads' }],
  },
  {
    id: 'punkte',
    title: 'Was bedeuten die Punkte (Score/Vorauswahl)?',
    keys: 'punkte score vorauswahl prescreen bewertung mindestgrenze grenze 70 schwelle wie berechnet tier top mittel',
    text: (c) =>
      `Die Vorauswahl gibt 0–100 Punkte aus Quellsignalen: Kampagnenbranche (bis 15), Telefon (15), Öffnungszeiten (10), Eintrag kürzlich gepflegt (bis 20), online aktiv ohne eigene Seite (15), Freemail statt eigener Domain (10), junger Betrieb (bis 15); Abzüge bei veralteten Einträgen oder wenn eine Website wahrscheinlich ist. Aktuelle Mindestgrenze: ${c.filters.minLeadScore} Punkte. Die Punkte ordnen die Prüfreihenfolge – sie sind keine Kaufwahrscheinlichkeit. Daneben gibt es den belegten Eignungs-Score aus der manuellen Recherche.`,
    links: [{ href: '/admin/suche', label: 'Grenze einstellen' }],
  },
  {
    id: 'segmente',
    title: 'Was sind Segmente (neu, social_only, etabliert)?',
    keys: 'segment segmente neu social_only social etabliert priorität',
    text: (c) =>
      `Priorität neu > social_only > etabliert. „neu“: frisch aufgetaucht mit ${c.segments.newMinRatings}–${c.segments.newMaxRatings} Bewertungen (nur mit zulässiger Bewertungsquelle); „social_only“: nur Instagram/Facebook/TikTok/Linktree statt Website; „etabliert“: alle übrigen geeigneten.`,
  },
  {
    id: 'demo',
    title: 'Wie entsteht eine Demo-Website?',
    keys: 'demo demos website entwurf generator bauen erstellen template vorlage inhalt texte bilder',
    text: (c) =>
      `Für jeden geeigneten Lead erstellt Claude die Texte (ohne erfundene Fakten, Leistungen als Beispiel gekennzeichnet), dazu ein Branchen-Template mit Farbpalette. Danach laufen automatische Prüfungen (Barrierefreiheit, Qualität). Die ersten ${c.review.manualReviewFirstN} Demos prüfst du einzeln. Demos sind nicht in Suchmaschinen und laufen nach ${c.timing.demoExpiryDays} Tagen ab. Demos bauen nutzt den Anthropic-Schlüssel.`,
    links: [{ href: '/admin/demos', label: 'Demos prüfen' }],
  },
  {
    id: 'demo_pruefen',
    title: 'Wie prüfe und gebe ich eine Demo frei?',
    keys: 'demo prüfen freigeben freigabe review ablehnen neu bauen kontrolle',
    text: () =>
      'Akquise → Demos prüfen: Vorschau ansehen (Desktop/Handy), Qualitätswerte lesen, dann „Freigeben“ oder mit Hinweis neu bauen lassen. Erst freigegebene Demos werden veröffentlicht und bekommen einen Brief.',
    links: [{ href: '/admin/demos', label: 'Demos prüfen' }],
  },
  {
    id: 'brief',
    title: 'Wie sieht der Brief aus und wie entsteht er?',
    keys: 'brief briefe anschreiben werbebrief qr code inhalt aufbau din 5008 text vorlage',
    text: () =>
      'Ein einseitiger persönlicher Brief nach DIN 5008 an „das Team von …“ mit großem QR-Code (mind. 4 × 4 cm) und Kurz-Link zur Demo, „online bis …“, Angebot und Garantie, Hinweisen zu Datenquelle und Widerspruch. Texte kommen aus Branchen-Playbooks mit Wahrheits-Check (nur belegte Aussagen). Er darf nicht wie eine Rechnung aussehen.',
    links: [{ href: '/admin/letters', label: 'Briefe freigeben' }],
  },
  {
    id: 'versand',
    title: 'Wie werden Briefe versendet (easyNova)?',
    keys: 'versand versenden senden post easynova briefdienst porto testmodus testauftrag guthaben druck zustellung',
    text: (c) =>
      `Briefdienst ist easyNova (digiBrief-API). Ablauf: Brief freigeben → Versand im eingestellten Modus. Reihenfolge vor dem echten Start: 3 Testaufträge im Testmodus → 1 echter Brief an dich → erst dann echte Leads. Das Prepaid-Guthaben bei easyNova muss reichen; der Server warnt bei zu wenig. Zustellung geschätzt nach ${c.timing.assumeDeliveredAfterDays} Tagen. Ohne deine Freigabe geht kein Brief raus; ich versende nichts.`,
    links: [{ href: '/admin/outbox', label: 'Postausgang' }],
  },
  {
    id: 'testbrief',
    title: 'Wie mache ich einen Testbrief?',
    keys: 'testbrief test brief an mich probe muster testadresse',
    text: () =>
      'Trage zuerst unter Einstellungen → Brief die Testadresse ein. Dann kannst du in „Briefe freigeben“ einen Testbrief an dich auslösen. Im Testmodus wird nichts gedruckt.',
    links: [{ href: '/admin/settings?bereich=letter', label: 'Testadresse' }],
  },
  {
    id: 'folgebrief',
    title: 'Wie funktionieren Folgebriefe?',
    keys: 'folgebrief follow up followup nachfassen erinnerung zweiter dritter brief',
    text: (c) =>
      `Höchstens ${c.letter.maxLettersPerLead} Briefe pro Betrieb. Brief 2: kein Scan ${c.timing.followupAfterDays} Tage nach geschätzter Zustellung → kurzer Brief „nur noch bis … online“ (Demo wird verlängert). Brief 3: heißer Lead (≥ ${c.timing.hotLeadMinViews} Aufrufe oder Kauf-Klick, kein Kauf nach ${c.timing.hotLeadAfterDays} Tagen) → „Wir haben Ihre Seite verbessert“. Folgebriefe: ${c.switches.followupEnabled ? 'an' : 'aus'}.`,
  },
  {
    id: 'tracking',
    title: 'Wie wird gemessen (QR-Scans, Klicks)?',
    keys: 'tracking messung scan scans qr klick klicks aufrufe statistik kennzahlen funnel kurz link datenschutz cookies quote',
    text: () =>
      'Jeder Brief hat einen eigenen QR-Link (/q/…) und einen Kurz-Code. Ein Scan wird als Ereignis gespeichert und leitet zur Demo weiter – ohne vollständige IP und ohne Tracking-Cookies. Danach zählen Demo-Aufrufe, Kauf-Klicks, Checkout, Zahlung. Zahlen: Auswertung → Kennzahlen und Funnel.',
    links: [
      { href: '/admin/funnel', label: 'Funnel' },
      { href: '/admin/kpis', label: 'Kennzahlen' },
    ],
  },
  {
    id: 'checkout',
    title: 'Wie kauft ein Kunde (Checkout, Stripe)?',
    keys: 'checkout kauf kaufen stripe zahlung bezahlung karte sepa lastschrift bestellung rechnung',
    text: () =>
      'Auf der Demo „Seite übernehmen“ → Tarifwahl ohne Vorauswahl → Stripe Checkout (Karte/SEPA) → Rechnung mit fortlaufender Nummer. Danach Onboarding-Link. Stripe läuft derzeit in der Sandbox; der Wechsel auf live ist ein eigener, freizugebender Schritt.',
    links: [{ href: '/admin/orders', label: 'Bestellungen' }],
  },
  {
    id: 'onboarding',
    title: 'Was passiert nach dem Kauf (Onboarding, Go-Live)?',
    keys: 'onboarding nach dem kauf golive go-live live schalten domain veröffentlichen übergabe änderungsrunden',
    text: (c) =>
      `Der Kunde füllt das Onboarding aus (Impressum-Pflichtangaben, Datenschutzerklärung, Wünsche). Die Seite wird überarbeitet, er sieht eine Vorschau mit bis zu ${c.onboarding.includedChangeRounds} Änderungsrunden. Nach Freigabe: Domain auf seinen Namen, Veröffentlichung ohne Demo-Banner, Live-Check, Übergabe-Mail.`,
    links: [{ href: '/admin/customers', label: 'Kunden & Websites' }],
  },
  {
    id: 'support',
    title: 'Wie läuft der Support?',
    keys: 'support anfragen nachrichten mails email antworten kunde frage beschwerde postfach',
    text: (c) =>
      `Eingehende Mails werden klassifiziert (Frage, Änderungswunsch, Beschwerde, Widerspruch, Rechnung, Spam). Widersprüche werden automatisch gesperrt, sonst entsteht ein Antwortentwurf, den du prüfst. Automatische Antworten: ${c.switches.autoReply ? 'an' : 'aus'}. Unter Kunden → Support kannst du Nachrichten beantworten oder löschen.`,
    links: [{ href: '/admin/support', label: 'Support' }],
  },
  {
    id: 'widerspruch',
    title: 'Was passiert bei Widerspruch / Opt-out?',
    keys: 'widerspruch opt out optout kein interesse sperre sperrliste abmelden löschen lassen dsgvo',
    text: () =>
      'Klickt ein Betrieb „Kein Interesse“ oder widerspricht per Mail, wird er gesperrt und anonymisiert; auf der Sperrliste steht nur ein Hash. Er bekommt nie wieder Post.',
  },
  {
    id: 'recht',
    title: 'Welche Regeln gelten für Werbung (UWG/DSGVO)?',
    keys: 'recht rechtlich uwg dsgvo werbung erlaubt kalt email anruf whatsapp regel compliance datenschutz',
    text: () =>
      'Werbung nur per Brief – keine Kalt-E-Mails, -Anrufe, SMS oder WhatsApp. E-Mails nur an Kontakte, die ihre Adresse selbst gegeben haben. Nur belegte Aussagen in Brief und Demo. Brief mit Hinweis auf Datenquelle und Widerspruchsrecht. Das ist eine Zusammenfassung der Projektregeln, keine Rechtsberatung – rechtliche Freigaben triffst du bzw. eine Fachperson.',
    links: [{ href: '/admin/settings?bereich=legal', label: 'Rechtstexte' }],
  },
  {
    id: 'claims',
    title: 'Was sind Claims und Playbooks?',
    keys: 'claims claim behauptung zahlen statistik belegt quelle playbook playbooks branche wahrheit wahrheitscheck',
    text: () =>
      'Claims sind belegte Aussagen (z. B. Statistiken) mit Quelle; nur freigegebene Claims dürfen in Briefe. Playbooks enthalten die Branchen-Texte. Der Wahrheits-Check blockiert Briefe mit unbelegten Aussagen. Verwalten unter Labor → Claims & Playbooks.',
    links: [{ href: '/admin/claims', label: 'Claims & Playbooks' }],
  },
  {
    id: 'optimizer',
    title: 'Was machen Varianten, Optimizer und Lern-Agent?',
    keys: 'optimizer varianten a/b test experiment lernen lern agent thompson statistik kontrollgruppe',
    text: (c) =>
      `Varianten sind Brief-/Demo-Versionen im A/B-Test. Der Optimizer verteilt neue Briefe nach Thompson Sampling (Kontrollgruppe ≥ 15 %, Exploration ≥ 20 %), sobald je Variante genug Briefe da sind (${c.optimizer.minLettersForSignal}). Der Lern-Agent schlägt wöchentlich höchstens eine Änderung vor – du entscheidest.`,
    links: [{ href: '/admin/variants', label: 'Varianten' }],
  },
  {
    id: 'budget',
    title: 'Wie wird das Budget kontrolliert?',
    keys: 'budget kosten geld ausgaben limit wochenbudget teuer ledger',
    text: (c) =>
      `Jede kostenpflichtige Aktion wird gebucht. Wochenbudget Briefe: ${eur(c.budget.weeklyBudgetCents)}, KI: ${eur(c.budget.weeklyLlmBudgetCents)}, Google: ${eur(c.budget.weeklyPlacesBudgetCents)}. Ist ein Budget aufgebraucht, stoppt die jeweilige Aktion. Übersicht: Auswertung → Budget.`,
    links: [{ href: '/admin/budget', label: 'Budget' }],
  },
  {
    id: 'modus',
    title: 'Testmodus, Live-Modus und Not-Aus',
    keys: 'testmodus live modus dry run dryrun not aus notaus killswitch echte aktionen sicher schalter automatik',
    text: (c) =>
      `Im Testmodus (DRY_RUN) passieren keine echten Briefe, Zahlungen oder Domainkäufe. Aktuell: ${c.switches.dryRun ? 'Testmodus' : 'LIVE'}. Der Not-Aus stoppt alle kostenpflichtigen Aktionen sofort. Beides schaltest nur du unter System → Einstellungen. Automatik (Versand, Demo-Freigabe, Folgebriefe, Antworten) ist einzeln schaltbar.`,
    links: [{ href: '/admin/settings', label: 'Einstellungen' }],
  },
  {
    id: 'server',
    title: 'Wie funktioniert der Server (Worker)?',
    keys: 'server worker contabo vps termius hintergrund neustart aktualisieren aktualisiere update updaten setup docker befehl',
    text: () =>
      'Die Verwaltung läuft bei Netlify, die Datenbank bei Supabase. Die Hintergrundarbeit (Lead-Suche, Versand, Status, Berichte) macht dein Worker-Server bei Contabo und meldet sich alle 5 Minuten. Aktualisieren in Termius mit: curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/claude/website-brief-maschine-0d0s37/infra/vps/setup.sh | bash',
    links: [{ href: '/admin/jobs', label: 'Jobs' }],
  },
  {
    id: 'server_neu',
    title: 'Server neu einrichten / Zugangsdaten erneuern',
    keys: 'einmal code einmalcode neu einrichten zugang worker bootstrap env neu verbinden',
    text: () =>
      'In System → Einstellungen → Worker-Server erzeugst du einen Einmal-Code. In Termius dann den Setup-Befehl mit „| NEU=1 bash“ ausführen und den Code eingeben – der Server holt sich damit die Zugangsdaten neu.',
    links: [{ href: '/admin/settings', label: 'Einstellungen' }],
  },
  {
    id: 'jobs',
    title: 'Was sind Jobs?',
    keys: 'jobs job warteschlange queue hintergrund aufgaben fehlgeschlagen geplant cron',
    text: () =>
      'Jobs sind Hintergrundaufgaben des Servers: Lead-Suche, Demo-Bau, Brief-Status, Funnel, Warn-Mails, Optimizer u. a. Unter System → Jobs siehst du, was läuft, was wartet und was fehlgeschlagen ist.',
    links: [{ href: '/admin/jobs', label: 'Jobs' }],
  },
  {
    id: 'warnungen',
    title: 'Was bedeuten Warnungen?',
    keys: 'warnung warnungen alert alerts meldung fehler problem rot gesundheit health',
    text: () =>
      'Warnungen meldet das System bei Problemen (z. B. Server meldet sich nicht, Budget fast leer, Backup fehlt). Sie stehen in der Übersicht; wichtige kommen per Mail. Mit „Erledigt“ blendest du sie aus.',
    links: [{ href: '/admin', label: 'Übersicht' }],
  },
  {
    id: 'einstellungen',
    title: 'Wo stelle ich etwas ein?',
    keys: 'einstellungen einstellen ändern konfiguration settings wo ändere ich bereiche',
    text: () =>
      'System → Einstellungen, aufgeteilt in Bereiche: Absender, Preise & Steuer, Brief, Zielgruppe, Lead-Quelle, Budget, Zeiten, Support, Rechtstexte, Worker-Server. Pflichtangaben, die noch fehlen, stehen oben.',
    links: [{ href: '/admin/settings', label: 'Einstellungen' }],
  },
  {
    id: 'absender',
    title: 'Wo trage ich Absender und Impressum ein?',
    keys: 'absender impressum name firma adresse anschrift kontakt foto whatsapp vorstellung eintragen einstellen stelle',
    text: () =>
      'Einstellungen → Absender: Name, Firmenname, Anschrift, E-Mail, Telefon, WhatsApp, Foto und Kurzvorstellung. Diese Angaben stehen im Brief, auf der Demo und im Impressum – ohne sie startet kein echter Versand.',
    links: [{ href: '/admin/settings?bereich=sender', label: 'Absender' }],
  },
  {
    id: 'steuer',
    title: 'Steuer und Rechnungen',
    keys: 'steuer kleinunternehmer 19 ustg umsatzsteuer rechnung rechnungsnummer mwst',
    text: (c) =>
      `Rechnungen bekommen eine fortlaufende Nummer (Präfix ${c.tax.invoicePrefix}). Eingestellt: ${c.tax.kleinunternehmer ? 'Kleinunternehmer nach § 19 UStG (ohne Umsatzsteuer)' : `${c.tax.vatRatePercent} % Umsatzsteuer`}. Bestätigt: ${c.tax.operatorConfirmed ? 'ja' : 'noch nicht'} – das musst du selbst bestätigen; ich treffe keine steuerliche Einordnung.`,
    links: [{ href: '/admin/settings?bereich=money', label: 'Preise & Steuer' }],
  },
  {
    id: 'golive',
    title: 'Was fehlt bis zum ersten echten Versand (Go-Live)?',
    keys: 'go live golive start starten erster echter brief echte briefe checkliste fertig bereit was fehlt startklar',
    text: () =>
      'Checkliste: Absender/Impressum und Rechtstexte eintragen, Steuerstatus bestätigen, Testadresse eintragen, erste Demos prüfen, 3 easyNova-Testaufträge + 1 echter Brief an dich, easyNova-Guthaben aufladen, Backup-Wiederherstellung prüfen, Stripe live erst nach Testkauf. Danach Testmodus aus – nur durch dich. Frag mich „Was sind die nächsten Schritte?“ für den aktuellen Stand.',
    links: [{ href: '/admin', label: 'Startklar-Schritte' }],
  },
  {
    id: 'erste_charge',
    title: 'Erste echte Charge',
    keys: 'erste charge 40 briefe start kampagne verteilung plan',
    text: (c) =>
      `Plan: ${c.budget.firstBatchSize} Briefe, verteilt auf Gastronomie, Handwerk und Beauty, Stadt ${c.targeting.cities[0] ?? 'Dortmund'}, Wochenbudget ${eur(c.budget.weeklyBudgetCents)}. Ziel der ersten Wochen: Messkette prüfen und erste Scan-Raten sehen, nicht Gewinner finden.`,
  },
  {
    id: 'staedte',
    title: 'Zielstädte und Branchen',
    keys: 'stadt städte zielstadt zielstädte ort orte branche branchen welche dortmund bochum handwerk beauty gastronomie',
    text: (c) =>
      `Zielstädte: ${c.targeting.cities.join(', ')}. Aktive Branchen: ${c.targeting.branches
        .filter((b) => b.active)
        .map((b) => b.label)
        .join(
          ', ',
        )}. Ich kann Städte hinzufügen oder entfernen („Füge Bochum hinzu“); Branchen änderst du unter Einstellungen → Zielgruppe.`,
    links: [{ href: '/admin/settings?bereich=targeting', label: 'Zielgruppe' }],
  },
  {
    id: 'website_pruefung',
    title: 'Woher weiß das System, dass ein Betrieb keine Website hat?',
    keys: 'website prüfung vorprüfung hat website keine website domain probe sicher',
    text: () =>
      'Aus der Karte (OSM) kommt nur, ob ein Website-Link eingetragen ist – das ist kein Beweis. Zusätzlich prüft der Server naheliegende Domains zum Namen. „Möglich“ heißt: vor dem Brief selbst nachsehen. Vor dem Versand bestätigst du das Fehlen der Website bei der Prüfung.',
  },
  {
    id: 'daten_loeschen',
    title: 'Wie lange werden Daten gespeichert?',
    keys: 'löschfrist löschen speichern aufbewahrung datenschutz anonymisieren retention wie lange',
    text: (c) =>
      `Ein nächtlicher Job löscht bzw. anonymisiert: Leads ohne Kauf nach ${c.timing.leadRetentionMonths} Monaten, Support nach ${c.timing.supportRetentionMonths} Monaten, Rechnungen nach ${c.timing.invoiceRetentionYears} Jahren (gesetzliche Aufbewahrung).`,
  },
  {
    id: 'backup',
    title: 'Backups',
    keys: 'backup sicherung wiederherstellung datenbank verloren',
    text: () =>
      'Die Datenbank liegt bei Supabase. Vor dem Go-Live muss eine Wiederherstellung einmal geprüft werden – solange meldet die Systemprüfung „Noch kein geprüftes Backup“.',
  },
  {
    id: 'anthropic',
    title: 'KI (Claude) und Anthropic-Schlüssel',
    keys: 'ki claude anthropic schlüssel key api token kosten modell assistent ki modus',
    text: (c) =>
      `Claude schreibt Demo-Texte, prüft Qualität und beantwortet Support-Entwürfe – alles im Budget gebucht (KI-Wochenbudget ${eur(c.budget.weeklyLlmBudgetCents)}). Mich gibt es mit und ohne KI: Ohne Schlüssel antworte ich aus Projektwissen und Daten; mit „Assistent mit KI“ (Einstellungen → Support) verstehe ich freie Fragen besser. KI-Modus: ${c.assistant.useAi ? 'an' : 'aus'}.`,
    links: [{ href: '/admin/settings?bereich=support', label: 'KI-Modus' }],
  },
  {
    id: 'assistent',
    title: 'Was kann der Assistent?',
    keys: 'assistent hilfe was kannst du befehle kommandos funktionen fähigkeiten',
    text: () =>
      'Ich lese alle Bereiche (Leads, Demos, Briefe, Bestellungen, Kunden, Support, Budget, Kennzahlen, Jobs, Warnungen, Protokoll, Einstellungen), erkläre das Projekt und schlage Aktionen vor: Lead-Suche starten/stoppen, Mindestgrenze setzen/anwenden, Lead aussortieren/zurückholen, Warnungen erledigen, Zielstädte ändern, Seiten öffnen. Ausgeführt wird erst nach deinem Klick. Briefversand, Zahlungen, Domains, Modus und Löschen bleiben bei dir.',
  },
  {
    id: 'kunden_live',
    title: 'Wo sehe ich Kunden und ihre Websites?',
    keys: 'kunden kunde websites live seiten domain hosting pflege care wartung',
    text: () =>
      'Kunden → Kunden & Websites: alle zahlenden Kunden mit Domain, Live-Status, Pflege-Arbeiten und Tarif. Änderungswünsche kommen über den Support.',
    links: [{ href: '/admin/customers', label: 'Kunden & Websites' }],
  },
  {
    id: 'mahnung',
    title: 'Was passiert, wenn eine Monatszahlung fehlschlägt?',
    keys: 'mahnung zahlung fehlgeschlagen dunning nicht bezahlt wartungsmodus offline säumig',
    text: () =>
      'Stripe versucht es automatisch erneut. Bleibt die Zahlung aus, folgen Erinnerungen; danach geht die Seite in den Wartungsmodus und du bekommst eine Meldung.',
  },
  {
    id: 'domain',
    title: 'Domains',
    keys: 'domain domains inwx registrieren wunschdomain verfügbar kauf',
    text: (c) =>
      `Die Wunschdomain wird im Checkout live geprüft (erlaubt: .${c.checkout.allowedTlds.join(', .')}) und erst nach Kauf und Freigabe auf den Kunden registriert (INWX). Ich kaufe keine Domains.`,
  },
  {
    id: 'wo_finde',
    title: 'Wo finde ich was in der Verwaltung?',
    keys: 'wo finde navigation menü bereiche seite seiten aufbau verwaltung admin',
    text: () =>
      'Heute: Übersicht mit allem, was wartet. Akquise: Lead-Suche, Leads, Demos prüfen, Briefe freigeben, Postausgang. Kunden: Support, Bestellungen, Kunden & Websites. Auswertung: Kennzahlen, Funnel, Budget, Wochenberichte. Labor: Varianten, Optimizer, Lern-Agent, Einwände, Claims. System: Einstellungen, Jobs, Protokoll.',
  },
  {
    id: 'einwaende',
    title: 'Was sind Einwände?',
    keys: 'einwände einwand objection gründe kein kauf warum nicht gekauft',
    text: () =>
      'Einwände sammelt das System aus Antworten und Support (z. B. „zu teuer“, „kein Bedarf“). Sie helfen dem Lern-Agenten, Briefe und Demos zu verbessern. Labor → Einwände.',
    links: [{ href: '/admin/objections', label: 'Einwände' }],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    keys: 'whatsapp wa me nachricht chat',
    text: () =>
      'WhatsApp gibt es nur als Link auf der Demo, über den der Betrieb dir schreibt („Frage zu meinem Website-Entwurf …“). Wir schreiben niemandem ungefragt per WhatsApp.',
  },
];

export function knowledgeById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE.find((k) => k.id === id);
}

/** Beste Wissenseinträge zur Frage (BM25 über Titel, Schlüsselwörter und Text) */
export function searchKnowledge(query: string, cfg: AppConfig, limit = 3): { entry: KnowledgeEntry; score: number }[] {
  const docs = KNOWLEDGE.map((k) => ({ id: k.id, strong: `${k.title} ${k.keys}`, weak: k.text(cfg) }));
  return bm25(query, docs)
    .slice(0, limit)
    .map((r) => ({ entry: knowledgeById(r.id)!, score: r.score }));
}
