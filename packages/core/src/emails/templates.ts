import { appUrl } from '../config/env';
import type { AppConfig } from '../config/settings';
import { esc } from '../util/html';
import { formatEuro } from '../util/time';
import { v4TierLabel } from '../services/offers-v4';

/**
 * Transaktions-Mails. Nur an Personen, die uns ihre Adresse selbst gegeben haben
 * (Checkout, Demo-Formular, Kundenkontakt) – keine Werbung, kein Tracking-Pixel.
 */
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export type Block =
  | string
  | { button: { href: string; label: string; secondary?: boolean } }
  | { list: string[] }
  /** nummerierte Schritte („So geht es weiter“) */
  | { steps: string[] }
  /** Liste mit Häkchen („Das ist erledigt“) */
  | { checks: string[] }
  /** hervorgehobener Kasten für Beträge, Laufzeiten, Garantie */
  | { box: string }
  | { small: string };

/**
 * SeitenWerk-Gestaltung (19.11.2026, wie seitenwerk.world): Nachtblau-Kopf mit Zeichen und Wortmarke, weiße Karte,
 * Serifen-Überschrift, blaue Knöpfe. Nur Systemschriften (keine Google Fonts: würde die IP des Empfängers an Google
 * übertragen), nur Inline-Styles und Tabellen (Outlook, Gmail, Apple Mail), kein Tracking-Pixel.
 */
const C = {
  night: '#071433',
  ink: '#0b1633',
  muted: '#4d5c7d',
  blue: '#1f4fd8',
  deep: '#10307a',
  ice: '#eef4ff',
  line: '#dbe4f5',
  paper: '#f4f7fd',
  ok: '#1f9d63',
} as const;
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function para(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink}">${esc(text).replace(/\n/g, '<br>')}</p>`;
}

function buttonHtml(b: { href: string; label: string; secondary?: boolean }): string {
  const bg = b.secondary ? '#ffffff' : C.blue;
  const fg = b.secondary ? C.blue : '#ffffff';
  const border = b.secondary ? C.line : C.blue;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 ${b.secondary ? '12' : '20'}px"><tr><td style="border-radius:10px;background:${bg};border:1px solid ${border}"><a href="${esc(b.href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:16px;font-weight:700;color:${fg};text-decoration:none;border-radius:10px">${esc(b.label)}&nbsp;→</a></td></tr></table>`;
}

function rowsHtml(items: string[], marker: (i: number) => string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px">${items
    .map(
      (t, i) =>
        `<tr><td valign="top" width="34" style="padding:0 0 12px">${marker(i)}</td><td valign="top" style="padding:2px 0 12px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${esc(t)}</td></tr>`,
    )
    .join('')}</table>`;
}

const badge = (content: string, bg: string, fg: string) =>
  `<div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:${bg};color:${fg};text-align:center;font-family:${SANS};font-size:13px;font-weight:700">${content}</div>`;

function greeting(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  return n ? `Guten Tag ${n},` : 'Guten Tag,';
}

function signatureText(cfg: AppConfig): string {
  const s = cfg.sender;
  return ['Viele Grüße', s.name, '', '--', s.company, `${s.street}, ${s.postalCode} ${s.city}`, s.email, s.website].join('\n');
}

export const SPAM_HINT = 'Lag diese E-Mail im Spam? Bitte als „Kein Spam“ markieren, damit unsere nächsten Nachrichten ankommen.';

export function renderEmail(
  cfg: AppConfig,
  input: {
    subject: string;
    name?: string | null;
    blocks: Block[];
    noGreeting?: boolean;
    noSpamHint?: boolean;
    /** große Überschrift oben in der Karte (Serifen, wie seitenwerk.world) */
    heading?: string;
    /** Vorschauzeile im Posteingang (unsichtbar in der Mail) */
    preheader?: string;
  },
): EmailContent {
  // 11.11.2026 (Betreiber): eigene Mails landen teils im Spam; jede Kunden-Mail bittet darum, uns als „Kein Spam“ zu markieren
  // Im Text am Ende des Inhalts, im HTML klein unter dem Gruß (stört dort den Lesefluss nicht)
  const blocks: Block[] = input.blocks;
  const spamHint = input.noSpamHint ? '' : SPAM_HINT;
  const parts: string[] = [];
  const htmlParts: string[] = [];
  const links: string[] = [];
  if (input.heading) parts.push(input.heading);
  if (!input.noGreeting) {
    parts.push(greeting(input.name));
    htmlParts.push(para(greeting(input.name)));
  }
  for (const b of blocks) {
    if (typeof b === 'string') {
      parts.push(b);
      htmlParts.push(para(b));
    } else if ('button' in b) {
      parts.push(`${b.button.label}:\n${b.button.href}`);
      htmlParts.push(buttonHtml(b.button));
      if (!links.includes(b.button.href)) links.push(b.button.href);
    } else if ('list' in b) {
      parts.push(b.list.map((l) => `• ${l}`).join('\n'));
      htmlParts.push(rowsHtml(b.list, () => `<div style="width:8px;height:8px;margin:9px 0 0 8px;border-radius:4px;background:${C.blue}"></div>`));
    } else if ('steps' in b) {
      parts.push(b.steps.map((l, i) => `${i + 1}. ${l}`).join('\n'));
      htmlParts.push(rowsHtml(b.steps, (i) => badge(String(i + 1), C.ice, C.deep)));
    } else if ('checks' in b) {
      parts.push(b.checks.map((l) => `✓ ${l}`).join('\n'));
      htmlParts.push(rowsHtml(b.checks, () => badge('✓', '#e3f6ec', C.ok)));
    } else if ('box' in b) {
      parts.push(b.box);
      htmlParts.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 20px"><tr><td style="background:${C.ice};border-left:4px solid ${C.blue};border-radius:8px;padding:14px 16px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${esc(b.box).replace(/\n/g, '<br>')}</td></tr></table>`,
      );
    } else {
      parts.push(b.small);
      htmlParts.push(
        `<p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted}">${esc(b.small)
          .replace(/\n/g, '<br>')
          .replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:${C.muted}">${u}</a>`)}</p>`,
      );
    }
  }
  if (spamHint) parts.push(spamHint);
  const sig = signatureText(cfg);
  const text = `${parts.join('\n\n')}\n\n${sig}\n`;
  const s = cfg.sender;
  const site = (s.website ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const siteHref = s.website ? (/^https?:\/\//.test(s.website) ? s.website : `https://${s.website}`) : '';
  // Ersatzlinks für Knöpfe gesammelt unten statt unter jedem Knopf (ruhiger)
  const notes = [
    spamHint,
    links.length
      ? `Falls ein Knopf nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>${links
          .map((l) => `<a href="${esc(l)}" style="color:${C.blue};word-break:break-all">${esc(l)}</a>`)
          .join('<br>')}`
      : '',
  ].filter(Boolean);
  const fallback = notes.length
    ? `<div style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${C.line}">${notes
        .map(
          (n) =>
            `<p style="margin:0 0 10px;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted}">${n === spamHint ? esc(n) : n}</p>`,
        )
        .join('')}</div>`
    : '';
  const preheader = input.preheader ?? '';
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px">
<tr><td style="background:${C.night};border-radius:16px 16px 0 0;padding:20px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:8px;padding:3px;line-height:0"><img src="${esc(appUrl('/brand/seitenwerk-mark-96.png'))}" width="28" height="28" alt="" style="display:block;border:0"></td>
<td style="padding-left:12px;font-family:${SERIF};font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#ffffff">SeitenWerk<span style="color:#5b8cff">.</span></td>
</tr></table>
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 28px 28px;border:1px solid ${C.line};border-top:0">
${input.heading ? `<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.3px;color:${C.ink}">${esc(input.heading)}</h1>` : ''}
${htmlParts.join('\n')}
<p style="margin:24px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink}">Viele Grüße<br><strong>${esc(s.name)}</strong><br><span style="color:${C.muted};font-size:14px">${esc(s.company)}</span></p>
${fallback}
</td></tr>
<tr><td style="padding:20px 12px 8px;text-align:center;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted}">
${esc(s.company)} · ${esc(s.street)} · ${esc(s.postalCode)} ${esc(s.city)}<br>
<a href="mailto:${esc(s.email)}" style="color:${C.muted}">${esc(s.email)}</a>${siteHref ? ` · <a href="${esc(siteHref)}" style="color:${C.muted}">${esc(site)}</a>` : ''}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: input.subject, text, html };
}

export function orderConfirmationEmail(
  cfg: AppConfig,
  d: {
    name: string;
    company: string;
    invoiceNumber: string;
    amount: string;
    onboardingUrl: string;
    prepared?: boolean;
    domain: string | null;
    /** Option B: Ende der Mindestlaufzeit (formatiert) */
    monthlyMinTermEnds?: string | null;
    /** Zufriedenheitsgarantie bis (formatiert) */
    guaranteeUntil?: string | null;
    v4?: { tier: 'basis' | 'care_plus' | 'komplett'; monthlyCents: number; billingMode?: 'saved_mandate' | 'manual_checkout' };
  },
): EmailContent {
  // 19.11.2026 (Betreiber: „so viel Text“): kurz, aber alle Vertragsangaben (Preis, Start, Laufzeit, Garantie) bleiben
  const p = cfg.pricing;
  const komplett = d.v4?.tier === 'komplett';
  const terms: string[] = [];
  if (d.v4 && komplett)
    terms.push(
      `SeitenWerk Komplett: heute 0 €. ${formatEuro(d.v4.monthlyCents)}/Monat, erste Abbuchung 7 Tage nach Bestellung über Ihr bei Stripe hinterlegtes Zahlungsmittel. 12 Monate Laufzeit ab der ersten Abbuchung, danach monatlich kündbar.`,
    );
  else if (d.v4)
    terms.push(
      `${v4TierLabel(d.v4.tier)}: ${d.amount} einmalig, danach ${formatEuro(d.v4.monthlyCents)}/Monat ab Go-Live${d.v4.billingMode === 'saved_mandate' ? ' (automatisch über Ihr bei Stripe hinterlegtes Zahlungsmittel)' : ' (das Abo schließen Sie nach Go-Live gesondert ab)'}. Keine Abbuchung vor Go-Live, monatlich kündbar.`,
    );
  if (d.monthlyMinTermEnds)
    terms.push(
      `${d.amount}/Monat bis ${d.monthlyMinTermEnds} (Mindestlaufzeit), danach ${formatEuro(p.subscriptionCents)}/Monat, monatlich kündbar.`,
    );
  if (d.guaranteeUntil)
    terms.push(`Nicht zufrieden? Bis ${d.guaranteeUntil} antworten – Sie bekommen Ihr Geld zurück.`);
  return renderEmail(cfg, {
    subject: komplett
      ? `Ihre Bestellung: SeitenWerk Komplett für ${d.company}`
      : `Ihre Bestellung: ${d.v4 ? `SeitenWerk ${v4TierLabel(d.v4.tier)} – Einrichtung` : d.monthlyMinTermEnds ? p.monthlyName : p.packageName} für ${d.company} (Rechnung ${d.invoiceNumber})`,
    heading: 'Danke für Ihre Bestellung',
    preheader: d.prepared ? 'Als Nächstes kommt Ihre Vorschau.' : 'Nächster Schritt: Ihre Angaben eintragen (ca. 10 Minuten).',
    name: d.name,
    blocks: [
      komplett
        ? 'Ihr Zahlungsmittel ist hinterlegt.'
        : `Ihre Zahlung über ${d.amount} ist eingegangen. Die Rechnung ${d.invoiceNumber} liegt im Anhang.`,
      ...(terms.length ? [{ box: terms.join('\n') }] : []),
      d.prepared
        ? 'Ihre gespeicherten Angaben sind übernommen. Wir bereiten jetzt Ihre Vorschau vor.'
        : 'Jetzt fehlen nur noch Ihre Angaben (Impressum, Leistungen, Öffnungszeiten). Dauer: etwa 10 Minuten.',
      {
        button: {
          href: d.onboardingUrl,
          label: d.prepared ? 'Stand ansehen' : 'Angaben eintragen',
        },
      },
      {
        steps: [
          d.prepared ? 'Wir stellen die Website fertig' : 'Sie tragen Ihre Angaben ein',
          `Sie prüfen die Vorschau (${cfg.onboarding.includedChangeRounds} Änderungsrunden inklusive)`,
          d.domain ? `Wir schalten ${d.domain} live` : 'Wir schalten Ihre Website live',
        ],
      },
      'Fragen? Einfach auf diese E-Mail antworten.',
    ],
  });
}

export function paymentFailedEmail(cfg: AppConfig, d: { name: string; retryUrl: string }): EmailContent {
  return renderEmail(cfg, {
    subject: 'Ihre Zahlung konnte nicht abgeschlossen werden',
    heading: 'Zahlung nicht abgeschlossen',
    name: d.name,
    blocks: [
      'leider ist Ihre Zahlung nicht bei uns angekommen, zum Beispiel weil die Lastschrift zurückgegeben wurde. Sie verlieren dabei kein Geld.',
      { button: { href: d.retryUrl, label: 'Erneut bestellen' } },
      'Fragen? Einfach auf diese E-Mail antworten.',
    ],
  });
}

/** Rechnung zu einer Monatsrate (Option B) bzw. zu „Hosting & Pflege“. */
export function recurringInvoiceEmail(
  cfg: AppConfig,
  d: { name: string; invoiceNumber: string; amount: string; period: string; domain: string | null },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihre Rechnung ${d.invoiceNumber}${d.domain ? ` für ${d.domain}` : ''}`,
    heading: 'Zahlung eingegangen',
    name: d.name,
    blocks: [`danke! ${d.amount} für ${d.period} sind eingegangen. Die Rechnung ${d.invoiceNumber} liegt im Anhang.`],
  });
}

/** Monatsrate konnte nicht eingezogen werden (Stripe versucht es automatisch erneut). */
export function subscriptionPaymentFailedEmail(
  cfg: AppConfig,
  d: { name: string; amount: string; payUrl: string | null; final: boolean; domain: string | null },
): EmailContent {
  const blocks: Block[] = [
    `die Monatsrate über ${d.amount}${d.domain ? ` für ${d.domain}` : ''} konnte nicht eingezogen werden.`,
    d.final
      ? 'Ihre Website ist deshalb vorübergehend pausiert. Sobald die Zahlung da ist, ist sie automatisch wieder online.'
      : 'Wir versuchen es in den nächsten Tagen automatisch noch einmal. Ihre Website bleibt online.',
  ];
  if (d.payUrl) blocks.push({ button: { href: d.payUrl, label: 'Rate bezahlen' } });
  return renderEmail(cfg, {
    subject: d.final ? 'Ihre Website ist pausiert – Zahlung ausstehend' : 'Ihre Monatsrate konnte nicht eingezogen werden',
    heading: d.final ? 'Ihre Website ist pausiert' : 'Monatsrate nicht eingezogen',
    name: d.name,
    blocks,
  });
}

/** Zahlungserinnerung 1/2 nach erfolglosen automatischen Einzugsversuchen. */
export function dunningReminderEmail(
  cfg: AppConfig,
  d: { name: string; stage: 1 | 2; amount: string; domain: string | null; pauseOn: string | null; payUrl: string | null },
): EmailContent {
  const blocks: Block[] = [
    `${d.stage === 1 ? 'die' : 'noch einmal zur'} offene${d.stage === 1 ? '' : 'n'} Monatsrate über ${d.amount}${d.domain ? ` für ${d.domain}` : ''}${d.stage === 1 ? ' konnte nicht eingezogen werden.' : '.'}`,
    d.pauseOn
      ? `Bitte bis ${d.pauseOn} bezahlen, sonst müssen wir Ihre Website vorübergehend pausieren.`
      : 'Bitte bezahlen Sie die Rate so bald wie möglich.',
  ];
  if (d.payUrl) blocks.push({ button: { href: d.payUrl, label: 'Rate bezahlen' } });
  blocks.push('Gibt es ein Problem? Einfach antworten, wir finden eine Lösung.');
  return renderEmail(cfg, {
    subject: d.stage === 1 ? 'Zahlungserinnerung: offene Monatsrate' : 'Zweite Zahlungserinnerung: offene Monatsrate',
    heading: 'Zahlungserinnerung',
    name: d.name,
    blocks,
  });
}

/** Bestätigung der Rückabwicklung im Rahmen der Zufriedenheitsgarantie. */
export function guaranteeRefundEmail(
  cfg: AppConfig,
  d: { name: string; amount: string; monthly: boolean; domainRegistered: string | null; domainExpires?: string | null },
): EmailContent {
  return renderEmail(cfg, {
    subject: 'Ihre Bestellung wurde rückabgewickelt (Zufriedenheitsgarantie)',
    heading: 'Rückabwicklung bestätigt',
    name: d.name,
    blocks: [
      `wie versprochen erstatten wir Ihnen ${d.amount}${d.monthly ? ', der Vertrag ist beendet' : ''}. Die Website ist offline. Die Stornorechnung kommt separat.`,
      d.domainRegistered
        ? `Die Domain ${d.domainRegistered} gehört Ihnen. Möchten Sie sie behalten, antworten Sie einfach – wir schicken den Code für den Umzug. Sonst läuft sie${d.domainExpires ? ` am ${d.domainExpires}` : ''} aus.`
        : 'Es wurde noch keine Domain registriert, Sie müssen nichts tun.',
      'Danke, dass Sie es ausprobiert haben.',
    ],
  });
}

/** Einzige Erinnerung an einen Lead, der uns selbst mit E-Mail-Adresse kontaktiert hat (mit Abmeldelink). */
export function demoReminderEmail(
  cfg: AppConfig,
  d: { name: string | null; demoUrl: string; expiresLabel: string; unsubscribeUrl: string },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihr Website-Entwurf ist noch bis ${d.expiresLabel} online`,
    heading: 'Ihr Entwurf ist noch online',
    preheader: `Noch bis ${d.expiresLabel} ansehen.`,
    name: d.name ?? '',
    blocks: [
      `kurze Erinnerung: Ihr Website-Entwurf ist noch bis ${d.expiresLabel} online.`,
      { button: { href: d.demoUrl, label: 'Entwurf ansehen' } },
      'Das ist die einzige Erinnerung, danach schreiben wir Ihnen nicht mehr.',
      { small: `Keine Erinnerungen mehr: ${d.unsubscribeUrl}` },
    ],
  });
}

/** Angeforderter Link zur Demo („Link per E-Mail zuschicken“) mit Bestätigung für Erinnerungen (Double-Opt-in). */
export function optinLinkEmail(
  cfg: AppConfig,
  d: { businessName: string; demoUrl: string; expiresLabel: string; confirmUrl: string; unsubscribeUrl: string },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihr Website-Entwurf für ${d.businessName}`,
    heading: 'Ihr Website-Entwurf',
    preheader: `Online bis ${d.expiresLabel}.`,
    blocks: [
      `hier ist Ihr Entwurf, online bis ${d.expiresLabel}.`,
      { button: { href: d.demoUrl, label: 'Entwurf ansehen' } },
      'Wünsche zu Texten, Fotos oder Farben passe ich vor einer Bestellung kostenlos an. Einfach antworten.',
      'Möchten Sie bis dahin höchstens zweimal erinnert werden?',
      { button: { href: d.confirmUrl, label: 'Ja, erinnern', secondary: true } },
      { small: `Ohne Bestätigung schreiben wir Ihnen nicht erneut. Keine E-Mails mehr: ${d.unsubscribeUrl}` },
    ],
  });
}

/** Einzige Nachfrage nach bestätigter Anmeldung: kostenlose Anpassung anbieten. */
export function optinFollowupEmail(
  cfg: AppConfig,
  d: { demoUrl: string; wishUrl: string; expiresLabel: string; unsubscribeUrl: string },
): EmailContent {
  return renderEmail(cfg, {
    subject: 'Passt Ihr Website-Entwurf so?',
    heading: 'Passt Ihr Entwurf so?',
    blocks: [
      `Ihr Entwurf ist noch bis ${d.expiresLabel} online. Soll noch etwas anders sein? Ein kurzer Satz genügt, ich passe es vor einer Bestellung kostenlos an.`,
      { button: { href: d.wishUrl, label: 'Wunsch schicken' } },
      { button: { href: d.demoUrl, label: 'Entwurf ansehen', secondary: true } },
      { small: `Keine E-Mails mehr: ${d.unsubscribeUrl}` },
    ],
  });
}

export function refundEmail(cfg: AppConfig, d: { name: string; amount: string; cancellationNumber: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `Erstattung Ihrer Zahlung (Stornorechnung ${d.cancellationNumber})`,
    heading: 'Erstattung veranlasst',
    name: d.name,
    blocks: [
      `wir haben ${d.amount} an Sie erstattet. Je nach Zahlungsart sehen Sie den Betrag in wenigen Tagen. Die Stornorechnung ${d.cancellationNumber} liegt im Anhang.`,
    ],
  });
}

export function renewalReminderEmail(
  cfg: AppConfig,
  d: { name: string; domain: string | null; hostingUntil: string; subscriptionUrl: string | null },
): EmailContent {
  const price = `${formatEuro(cfg.pricing.subscriptionCents)}/Monat`;
  const blocks: Block[] = [`das Hosting für ${d.domain ?? 'Ihre Website'} ist bis ${d.hostingUntil} bezahlt.`];
  if (d.subscriptionUrl) {
    blocks.push(`Soll Ihre Website online bleiben? „${cfg.pricing.subscriptionName}“ kostet ${price}, monatlich kündbar.`, {
      button: { href: d.subscriptionUrl, label: `${cfg.pricing.subscriptionName} buchen` },
    });
  } else {
    blocks.push(
      `Soll Ihre Website online bleiben? Antworten Sie einfach, dann verlängern wir „${cfg.pricing.subscriptionName}“ für ${price} (monatlich kündbar).`,
    );
  }
  blocks.push('Kein Interesse? Dann müssen Sie nichts tun. Die Domain gehört Ihnen.');
  return renderEmail(cfg, {
    subject: `Ihr Hosting für ${d.domain ?? 'Ihre Website'} läuft am ${d.hostingUntil} aus`,
    heading: 'Ihr Hosting läuft bald aus',
    name: d.name,
    blocks,
  });
}

export function adminNotificationEmail(cfg: AppConfig, d: { title: string; lines: string[]; link?: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `[Website-Brief] ${d.title}`,
    heading: d.title,
    noGreeting: true,
    noSpamHint: true,
    blocks: [...d.lines, ...(d.link ? [{ button: { href: d.link, label: 'Im Dashboard öffnen' } }] : [])],
  });
}

export function previewReadyEmail(
  cfg: AppConfig,
  d: { name: string; previewUrl: string; summary: string | null; roundsLeft: number; firstVersion: boolean },
): EmailContent {
  return renderEmail(cfg, {
    subject: d.firstVersion ? 'Ihre Website-Vorschau ist fertig' : 'Ihre geänderte Website-Vorschau ist fertig',
    heading: d.firstVersion ? 'Ihre Vorschau ist fertig' : 'Ihre neue Vorschau ist fertig',
    preheader: 'Ansehen und mit einem Klick freigeben.',
    name: d.name,
    blocks: [
      d.firstVersion ? 'Ihre Website ist fertig vorbereitet.' : 'Ihre Änderungswünsche sind eingearbeitet.',
      ...(d.summary ? [d.summary] : []),
      { button: { href: d.previewUrl, label: 'Vorschau ansehen' } },
      `Passt alles? Mit einem Klick freigeben, dann geht sie live. Sonst Änderungen direkt dort eintragen (noch ${d.roundsLeft} Runde${d.roundsLeft === 1 ? '' : 'n'} inklusive).`,
    ],
  });
}

export function liveHandoverEmail(
  cfg: AppConfig,
  d: {
    name: string;
    url: string;
    domain: string | null;
    hostingUntil: string;
    formTarget: string;
    monthlyOffer?: { amountCents: number; url: string; automatic?: boolean };
  },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihre Website ist online: ${d.domain ?? d.url}`,
    heading: 'Ihre Website ist online',
    preheader: `Ab sofort erreichbar: ${d.domain ?? d.url}`,
    name: d.name,
    blocks: [
      { button: { href: d.url, label: 'Website ansehen' } },
      {
        checks: [
          d.domain ? `Die Domain ${d.domain} gehört Ihnen` : `Erreichbar unter ${d.url}`,
          `Anfragen aus dem Formular gehen an ${d.formTarget}`,
          d.monthlyOffer
            ? d.monthlyOffer.automatic
              ? `Monatstarif ${formatEuro(d.monthlyOffer.amountCents)} startet jetzt automatisch`
              : `Monatstarif ${formatEuro(d.monthlyOffer.amountCents)}: bitte unten bestätigen, erst dann wird abgebucht`
            : `Hosting und SSL bis ${d.hostingUntil} inklusive`,
        ],
      },
      ...(d.monthlyOffer
        ? [
            {
              button: {
                href: d.monthlyOffer.url,
                label: d.monthlyOffer.automatic ? 'Tarif verwalten' : 'Monatstarif bestätigen',
                secondary: d.monthlyOffer.automatic,
              },
            },
          ]
        : []),
      'Änderungen am Impressum oder neue Öffnungszeiten? Einfach antworten. Danke für Ihr Vertrauen!',
    ],
  });
}
