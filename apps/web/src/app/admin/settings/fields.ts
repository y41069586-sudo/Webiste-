import { SUPPORT_CLASSES } from '@wbm/core';

export type FieldType = 'text' | 'email' | 'number' | 'euro' | 'bool' | 'textarea' | 'lines' | 'json' | 'percent' | 'multi';

export interface FieldDef {
  path: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: readonly string[];
}

export interface SectionDef {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'sender',
    title: 'Absender & Impressumsdaten',
    description: 'Erscheint im Brief, auf Demo-Seiten (Footer), in E-Mails und Rechnungen.',
    fields: [
      { path: 'sender.name', label: 'Name (Unterschrift)', type: 'text' },
      { path: 'sender.company', label: 'Firmenname', type: 'text' },
      { path: 'sender.street', label: 'Straße und Hausnummer', type: 'text' },
      { path: 'sender.postalCode', label: 'PLZ', type: 'text' },
      { path: 'sender.city', label: 'Ort', type: 'text' },
      { path: 'sender.email', label: 'E-Mail', type: 'email' },
      { path: 'sender.phone', label: 'Telefon', type: 'text' },
      { path: 'sender.website', label: 'Website (ohne https://)', type: 'text' },
      { path: 'sender.taxNumber', label: 'Steuernummer (Rechnung)', type: 'text' },
      { path: 'sender.vatId', label: 'USt-IdNr. (optional)', type: 'text' },
      { path: 'sender.bankName', label: 'Bank (nur Rechnung)', type: 'text' },
      { path: 'sender.bankIban', label: 'IBAN (nur Rechnung)', type: 'text' },
      { path: 'sender.bankBic', label: 'BIC (nur Rechnung)', type: 'text' },
    ],
  },
  {
    id: 'pricing',
    title: 'Preise & Steuern',
    fields: [
      { path: 'pricing.packageName', label: 'Produktname', type: 'text' },
      { path: 'pricing.packageCents', label: 'Paketpreis (€)', type: 'euro' },
      { path: 'pricing.packageDescription', label: 'Leistungsbeschreibung (Checkout & Rechnung)', type: 'textarea' },
      { path: 'pricing.hostingMonthsIncluded', label: 'Inkl. Hosting (Monate)', type: 'number' },
      { path: 'pricing.subscriptionEnabled', label: 'Abo „Hosting & Pflege“ aktiv', type: 'bool', hint: 'v1: aus – stattdessen Erinnerungs-Mail' },
      { path: 'pricing.subscriptionName', label: 'Abo-Name', type: 'text' },
      { path: 'pricing.subscriptionCents', label: 'Abo-Preis pro Monat (€)', type: 'euro' },
      { path: 'pricing.subscriptionStartMonth', label: 'Abo-Start (Monat)', type: 'number' },
      { path: 'tax.kleinunternehmer', label: 'Kleinunternehmer (§ 19 UStG)', type: 'bool' },
      { path: 'tax.vatRatePercent', label: 'USt-Satz (%) falls nicht Kleinunternehmer', type: 'number' },
      { path: 'tax.pricesAreGross', label: 'Paketpreis ist Bruttopreis', type: 'bool', hint: 'Nur relevant ohne Kleinunternehmerregelung' },
      { path: 'tax.invoicePrefix', label: 'Rechnungsnummer-Präfix', type: 'text' },
      { path: 'tax.kleinunternehmerNote', label: 'Hinweis auf der Rechnung', type: 'text' },
      { path: 'checkout.sessionMinutes', label: 'Checkout-Session gültig (Minuten)', type: 'number' },
      { path: 'checkout.allowedTlds', label: 'Erlaubte Domain-Endungen (je Zeile)', type: 'lines' },
      { path: 'checkout.maxDomainPriceCents', label: 'Max. Domainpreis pro Jahr (€)', type: 'euro' },
    ],
  },
  {
    id: 'budget',
    title: 'Budget & Kosten',
    fields: [
      { path: 'budget.weeklyBudgetCents', label: 'Wochenbudget Briefe (€)', type: 'euro' },
      { path: 'budget.firstBatchSize', label: 'Erste Charge (Anzahl Briefe)', type: 'number' },
      { path: 'budget.weeklyPlacesBudgetCents', label: 'Wochenbudget Google Places (€)', type: 'euro' },
      { path: 'budget.weeklyLlmBudgetCents', label: 'Wochenbudget KI (€)', type: 'euro' },
      { path: 'budget.segmentShares', label: 'Budgetanteile je Segment (JSON)', type: 'json', hint: '{"dortmund:beauty:nagelstudio": 0.25, …} – leer = gleichmäßig' },
      { path: 'costs.letterEstimateCents', label: 'Schätzung pro Brief (€), falls Anbieter keinen Preis liefert', type: 'euro' },
      { path: 'costs.usdToEur', label: 'Kurs USD → EUR', type: 'number' },
      { path: 'costs.placesTextSearchPer1000UsdCents', label: 'Places Text Search pro 1000 (US-Cent)', type: 'number' },
      { path: 'costs.domainPerYearCents', label: 'Domain pro Jahr (€)', type: 'euro' },
      { path: 'costs.llm', label: 'KI-Preise je 1 Mio. Tokens (US-Cent, JSON)', type: 'json' },
    ],
  },
  {
    id: 'targeting',
    title: 'Städte, Branchen & Filter',
    fields: [
      { path: 'targeting.cities', label: 'Städte (eine pro Zeile)', type: 'lines' },
      { path: 'targeting.branches', label: 'Branchen (JSON)', type: 'json', hint: 'key, group (handwerk|beauty), label, queries, osmTags, googleTypes, weight, active' },
      { path: 'targeting.chainNames', label: 'Ketten/Franchise-Namen (eine pro Zeile)', type: 'lines' },
      { path: 'targeting.chainMinCities', label: 'Kette ab gleichem Namen in X Städten', type: 'number' },
      { path: 'targeting.maxPagesPerQuery', label: 'Max. Seiten pro Suchanfrage (1–3)', type: 'number' },
      { path: 'filters.minRating', label: 'Mindest-Bewertung', type: 'number' },
      { path: 'filters.minRatingCount', label: 'Mindestanzahl Bewertungen', type: 'number' },
      { path: 'filters.recontactMonths', label: 'Kein erneuter Kontakt für (Monate)', type: 'number' },
      { path: 'filters.requireOperational', label: 'Nur geöffnete Betriebe (OPERATIONAL)', type: 'bool' },
      { path: 'filters.socialDomains', label: '„Keine echte Website“-Domains (eine pro Zeile)', type: 'lines' },
    ],
  },
  {
    id: 'leadsource',
    title: 'Lead-Quelle & Compliance',
    description:
      'Standard ist OpenStreetMap. Die Google-Bedingungen verbieten das Speichern von Firmennamen und Adressen (docs/compliance-google.md). Google-Modi nur mit dokumentierter Prüfung/Genehmigung.',
    fields: [
      { path: 'leadSource.mode', label: 'Modus (osm | osm_google_signal | google_text_search)', type: 'text' },
      { path: 'leadSource.googleSignalAcknowledgement', label: 'Signal-Modus: rechtlich geprüft durch / am', type: 'text' },
      { path: 'leadSource.googleTextSearchApproval', label: 'Text-Search-Modus: Nachweis der Google-Genehmigung', type: 'text' },
      { path: 'filters.requireRatingSignal', label: 'Leads ohne Bewertungsdaten ablehnen', type: 'bool' },
    ],
  },
  {
    id: 'timing',
    title: 'Fristen, Review & Onboarding',
    fields: [
      { path: 'timing.demoExpiryDays', label: 'Demo-Ablauf (Tage)', type: 'number' },
      { path: 'timing.followupAfterDays', label: 'Follow-up nach (Tage ohne Scan)', type: 'number' },
      { path: 'timing.leadRetentionMonths', label: 'Leads ohne Reaktion löschen nach (Monate)', type: 'number' },
      { path: 'timing.invoiceRetentionYears', label: 'Aufbewahrung Rechnungen (Jahre)', type: 'number' },
      { path: 'timing.supportRetentionMonths', label: 'Löschung Support-Nachrichten ohne Kundenbezug (Monate)', type: 'number' },
      { path: 'timing.unpaidOrderRetentionMonths', label: 'Löschung abgebrochener Bestellungen (Monate)', type: 'number' },
      { path: 'timing.renewalReminderDays', label: 'Erinnerung vor Hosting-Ablauf (Tage)', type: 'number' },
      { path: 'timing.assumeDeliveredAfterDays', label: 'Zustellung annehmen nach (Tage)', type: 'number' },
      { path: 'timing.placesCacheDays', label: 'Places-Daten-Cache (Tage, max. 30)', type: 'number' },
      { path: 'review.manualReviewFirstN', label: 'Manuelle Prüfung der ersten N Demos', type: 'number' },
      { path: 'review.sampleRatePercent', label: 'Danach Stichprobe (%)', type: 'number' },
      { path: 'review.qaLighthouse', label: 'Lighthouse in der Demo-QA', type: 'bool' },
      { path: 'review.qaLlm', label: 'KI-Prüfung der Demo-Texte', type: 'bool' },
      { path: 'onboarding.includedChangeRounds', label: 'Inklusive Änderungsrunden', type: 'number' },
    ],
  },
  {
    id: 'letter',
    title: 'Brief & Versand',
    fields: [
      { path: 'letter.color', label: 'Farbdruck', type: 'bool' },
      { path: 'letter.deliveryProduct', label: 'Versandart (Pingen delivery_product)', type: 'text', hint: 'z. B. cheap, fast' },
      { path: 'letter.includeScreenshotPage', label: 'Seite 2 mit Screenshots', type: 'bool' },
      { path: 'letter.addressPosition', label: 'Anschriftenfeld (left = DE)', type: 'text' },
      { path: 'letter.maxLettersPerLead', label: 'Max. Briefe pro Lead', type: 'number' },
      { path: 'letter.testRecipient.name', label: 'Testbrief: Name', type: 'text' },
      { path: 'letter.testRecipient.street', label: 'Testbrief: Straße', type: 'text' },
      { path: 'letter.testRecipient.houseNumber', label: 'Testbrief: Hausnummer', type: 'text' },
      { path: 'letter.testRecipient.postalCode', label: 'Testbrief: PLZ', type: 'text' },
      { path: 'letter.testRecipient.city', label: 'Testbrief: Ort', type: 'text' },
    ],
  },
  {
    id: 'support',
    title: 'Support & Optimizer',
    fields: [
      { path: 'support.autoReplyClasses', label: 'Automatisch beantworten (nur mit AUTO_REPLY)', type: 'multi', options: SUPPORT_CLASSES },
      { path: 'optimizer.explorationShare', label: 'Exploration (Anteil 0–1)', type: 'number' },
      { path: 'optimizer.minLettersForSignal', label: 'Mindestbriefe je Segment für Signal', type: 'number' },
      { path: 'optimizer.samples', label: 'Thompson-Samples', type: 'number' },
    ],
  },
  {
    id: 'legal',
    title: 'Rechtstexte (vom Betreiber geliefert)',
    description: 'Markdown. Leer lassen = Platzhalterseite. Wir erstellen keine Rechtstexte.',
    fields: [
      { path: 'legal.impressumMarkdown', label: 'Impressum', type: 'textarea' },
      { path: 'legal.privacyMarkdown', label: 'Datenschutzerklärung', type: 'textarea' },
      { path: 'legal.termsMarkdown', label: 'AGB', type: 'textarea' },
      { path: 'legal.termsVersion', label: 'AGB-Version (wird bei Bestellung gespeichert)', type: 'text' },
    ],
  },
];

export const SWITCHES: { key: string; label: string; hint: string }[] = [
  { key: 'dryRun', label: 'DRY_RUN', hint: 'Nur PDFs/Entwürfe erzeugen, keine kostenpflichtigen API-Aufrufe' },
  { key: 'autoSend', label: 'AUTO_SEND', hint: 'Briefe ohne Einzel-Freigabe versenden' },
  { key: 'autoApproveDemos', label: 'AUTO_APPROVE_DEMOS', hint: 'Nach den ersten N Demos nur Stichproben' },
  { key: 'autoReply', label: 'AUTO_REPLY', hint: 'Support-Antworten der gewählten Klassen automatisch senden' },
  { key: 'followupEnabled', label: 'FOLLOWUP_ENABLED', hint: 'Zweiter Brief nach 12 Tagen ohne Scan' },
  { key: 'autoOptimize', label: 'AUTO_OPTIMIZE', hint: 'Optimizer setzt Budgetanteile automatisch' },
  { key: 'useRatingInLetter', label: 'USE_RATING_IN_LETTER', hint: 'Bewertungszeile im Brief – nur nach Compliance-Freigabe' },
  { key: 'realLettersUnlocked', label: 'Echte Briefe an Leads freigegeben', hint: 'Erst nach erfolgreichem Testbrief an dich selbst' },
  { key: 'autoRegisterDomains', label: 'Domains automatisch registrieren', hint: 'Aus: jede Domain-Registrierung einzeln unter „Kunden & Seiten“ freigeben' },
];

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  keys.slice(0, -1).forEach((k) => {
    cur[k] = (cur[k] as Record<string, unknown>) ?? {};
    cur = cur[k] as Record<string, unknown>;
  });
  cur[keys[keys.length - 1]!] = value;
}
