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

export const SPAM_HINT =
  'Damit unsere E-Mails sicher bei Ihnen ankommen: Falls diese Nachricht im Spam-Ordner lag, markieren Sie sie bitte als „Kein Spam“ und schauen Sie bei unseren nächsten E-Mails auch dort nach.';

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
  const p = cfg.pricing;
  const terms: Block[] = [];
  const komplett = d.v4?.tier === 'komplett';
  const box = (t: string): Block => ({ box: t });
  if (d.v4 && komplett)
    terms.push(box(
      `Ihr Tarif SeitenWerk Komplett: Es wurde nichts abgebucht. ${formatEuro(d.v4.monthlyCents)} pro Monat, die erste Abbuchung erfolgt 7 Tage nach Ihrer Bestellung über das bei Stripe gespeicherte Zahlungsmittel. Mindestlaufzeit 12 Monate ab der ersten Abbuchung, danach monatlich kündbar. Für jede Abbuchung erhalten Sie eine eigene Rechnung.`),
    );
  else if (d.v4)
    terms.push(box(
      `Einmalige Einrichtung: ${d.amount}. Ihr gewählter Tarif ${v4TierLabel(d.v4.tier)} kostet insgesamt ${formatEuro(d.v4.monthlyCents)} pro Monat. ${d.v4.billingMode === 'saved_mandate' ? 'Das Monatsabo startet automatisch nach bestätigtem Go-Live über das ausdrücklich vereinbarte, bei Stripe gespeicherte Zahlungsmittel.' : 'Das Monatsabo schließen Sie erst nach bestätigtem Go-Live gesondert ab.'} Keine Monatsabbuchung vor Go-Live und keine zwölfmonatige Mindestbindung.`),
    );
  if (d.monthlyMinTermEnds)
    terms.push(box(
      `Sie zahlen ${d.amount} pro Monat, die Mindestlaufzeit endet am ${d.monthlyMinTermEnds}. Danach kostet „${p.subscriptionName}“ automatisch nur noch ${formatEuro(p.subscriptionCents)} pro Monat und ist monatlich kündbar. Für jede Rate erhalten Sie eine eigene Rechnung.`),
    );
  if (d.guaranteeUntil)
    terms.push(box(
      `Zufriedenheitsgarantie: Sind Sie nicht zufrieden, antworten Sie bis zum ${d.guaranteeUntil} auf diese E-Mail – Sie bekommen Ihr Geld zurück${d.monthlyMinTermEnds ? ' und der Vertrag endet' : ''}.`),
    );
  return renderEmail(cfg, {
    subject: komplett
      ? `Ihre Bestellung: SeitenWerk Komplett für ${d.company}`
      : `Ihre Bestellung: ${d.v4 ? `SeitenWerk ${v4TierLabel(d.v4.tier)} – Einrichtung` : d.monthlyMinTermEnds ? p.monthlyName : p.packageName} für ${d.company} (Rechnung ${d.invoiceNumber})`,
    heading: 'Danke für Ihre Bestellung',
    preheader: d.prepared
      ? 'Ihre Angaben sind übernommen – als Nächstes kommt Ihre Vorschau.'
      : 'Nächster Schritt: Ihre Angaben für die Website eintragen (ca. 10 Minuten).',
    name: d.name,
    blocks: [
      komplett
        ? 'vielen Dank für Ihre Bestellung – Ihr Zahlungsmittel ist hinterlegt. Bezahlt wird erst, wenn Ihre fertige Website online ist.'
        : `vielen Dank für Ihre Bestellung – die Zahlung über ${d.amount} ist eingegangen. Die Rechnung ${d.invoiceNumber} finden Sie im Anhang.`,
      ...terms,
      d.prepared
        ? 'Ihre vor der Zahlung gespeicherte Einrichtung wurde übernommen: Betriebsdaten, Texte, Bilder, Anfrage-Empfänger und Wunschdomain. Wir bereiten die Vorschau vor; veröffentlicht wird erst nach Ihrer Freigabe.'
        : 'Damit Ihre Website online gehen kann, brauchen wir noch ein paar Angaben von Ihnen: Impressum, gegebenenfalls Logo und Fotos, Ihre Leistungen und Öffnungszeiten. Das dauert etwa 10 Minuten.',
      {
        button: {
          href: d.onboardingUrl,
          label: d.prepared ? 'Einrichtung und Vorschau ansehen' : 'Angaben für die Website eintragen',
        },
      },
      'So geht es weiter:',
      {
        steps: [
          d.prepared
            ? 'Ihre gespeicherten Angaben bilden die Grundlage für die Fertigstellung.'
            : 'Sie tragen Ihre Angaben ein (der Link bleibt gültig, Sie können jederzeit weitermachen).',
          'Wir passen die Website an und schicken Ihnen eine Vorschau.',
          `Sie geben die Vorschau frei oder wünschen Änderungen (bis zu ${cfg.onboarding.includedChangeRounds} Runden inklusive).`,
          d.domain
            ? `Wir registrieren ${d.domain} auf Ihren Namen und schalten die Website live.`
            : 'Wir registrieren Ihre Domain auf Ihren Namen und schalten die Website live.',
        ],
      },
      'Bei Fragen antworten Sie einfach auf diese E-Mail.',
    ],
  });
}

export function paymentFailedEmail(cfg: AppConfig, d: { name: string; retryUrl: string }): EmailContent {
  return renderEmail(cfg, {
    subject: 'Ihre Zahlung konnte nicht abgeschlossen werden',
    heading: 'Zahlung nicht abgeschlossen',
    name: d.name,
    blocks: [
      'leider ist Ihre Zahlung für das Website-Paket nicht bei uns angekommen (zum Beispiel weil die Lastschrift zurückgegeben wurde). Es wurde nichts abgebucht, das Sie nicht zurückerhalten.',
      'Wenn Sie die Website weiterhin möchten, können Sie die Bestellung hier erneut abschließen:',
      { button: { href: d.retryUrl, label: 'Bestellung erneut abschließen' } },
      'Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail.',
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
    blocks: [
      `vielen Dank – die Zahlung über ${d.amount} für den Zeitraum ${d.period} ist eingegangen. Die Rechnung ${d.invoiceNumber} finden Sie im Anhang.`,
      'Bei Fragen antworten Sie einfach auf diese E-Mail.',
    ],
  });
}

/** Monatsrate konnte nicht eingezogen werden (Stripe versucht es automatisch erneut). */
export function subscriptionPaymentFailedEmail(
  cfg: AppConfig,
  d: { name: string; amount: string; payUrl: string | null; final: boolean; domain: string | null },
): EmailContent {
  const blocks: Block[] = [
    `leider konnte die Monatsrate über ${d.amount}${d.domain ? ` für ${d.domain}` : ''} nicht eingezogen werden – zum Beispiel weil die Karte abgelaufen ist oder die Lastschrift zurückgegeben wurde.`,
    d.final
      ? 'Wir haben es mehrmals versucht. Damit keine weiteren Kosten entstehen, ist Ihre Website vorübergehend pausiert. Sobald die Zahlung eingegangen ist, ist sie automatisch wieder online.'
      : 'Wir versuchen es in den nächsten Tagen automatisch noch einmal. Ihre Website bleibt bis dahin online.',
  ];
  if (d.payUrl)
    blocks.push('Sie können die Rate auch direkt bezahlen oder Ihr Zahlungsmittel aktualisieren:', {
      button: { href: d.payUrl, label: 'Rate bezahlen' },
    });
  blocks.push('Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail.');
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
    d.stage === 1
      ? `die Monatsrate über ${d.amount}${d.domain ? ` für ${d.domain}` : ''} konnte auch nach mehreren automatischen Versuchen nicht eingezogen werden.`
      : `wir erinnern noch einmal an die offene Monatsrate über ${d.amount}${d.domain ? ` für ${d.domain}` : ''}.`,
    d.pauseOn
      ? `Bitte begleichen Sie die Rate bis zum ${d.pauseOn}. Ist sie bis dahin nicht eingegangen, müssen wir Ihre Website vorübergehend pausieren.`
      : 'Bitte begleichen Sie die Rate so bald wie möglich.',
  ];
  if (d.payUrl) blocks.push({ button: { href: d.payUrl, label: 'Rate bezahlen' } });
  blocks.push('Gibt es ein Problem mit der Zahlung? Antworten Sie einfach auf diese E-Mail – wir finden eine Lösung.');
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
      `schade, dass die Website nicht gepasst hat. Wie versprochen erstatten wir Ihnen ${d.amount}${d.monthly ? ' und haben den Vertrag beendet – es werden keine weiteren Raten abgebucht' : ''}. Die Stornorechnung folgt in einer separaten E-Mail.`,
      'Die Website ist offline genommen.',
      d.domainRegistered
        ? `Die Domain ${d.domainRegistered} ist auf Ihren Namen registriert. Wir übertragen sie Ihnen gern kostenlos: Antworten Sie einfach auf diese E-Mail, dann schicken wir Ihnen den Auth-Code für den Umzug zu einem Anbieter Ihrer Wahl. Möchten Sie sie nicht behalten, verlängern wir sie nicht${d.domainExpires ? ` – sie läuft dann am ${d.domainExpires} aus` : ''}.`
        : 'Eine Domain wurde noch nicht registriert, es bleibt also nichts zu tun.',
      'Vielen Dank, dass Sie es ausprobiert haben.',
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
      `vielen Dank für Ihre Nachricht zu Ihrem Website-Entwurf. Kurz zur Erinnerung: Der Entwurf ist noch bis ${d.expiresLabel} online, danach wird er automatisch gelöscht.`,
      { button: { href: d.demoUrl, label: 'Entwurf ansehen' } },
      'Haben Sie noch Fragen? Antworten Sie einfach auf diese E-Mail. Dies ist die einzige Erinnerung – wir schreiben Ihnen danach nicht mehr.',
      { small: `Keine Erinnerungen mehr erhalten: ${d.unsubscribeUrl}` },
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
    preheader: `Ihr Link zum Entwurf für ${d.businessName} – online bis ${d.expiresLabel}.`,
    blocks: [
      `wie gewünscht hier der Link zu Ihrem Website-Entwurf. Er ist bis ${d.expiresLabel} online.`,
      { button: { href: d.demoUrl, label: 'Entwurf ansehen' } },
      'Vor einer Bestellung passe ich Texte, Leistungen, Fotos und Farben kostenlos an Ihre Wünsche an. Schreiben Sie mir dazu einfach über das Formular auf der Seite oder antworten Sie auf diese E-Mail.',
      `Möchten Sie bis ${d.expiresLabel} höchstens zweimal kurz daran erinnert werden? Dann bestätigen Sie bitte hier:`,
      { button: { href: d.confirmUrl, label: 'Ja, Erinnerungen erhalten', secondary: true } },
      'Ohne Bestätigung schreiben wir Ihnen nicht erneut, außer Sie melden sich bei uns.',
      { small: `Keine E-Mails mehr erhalten: ${d.unsubscribeUrl}` },
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
      `vor ein paar Tagen haben Sie sich den Link zu Ihrem Website-Entwurf schicken lassen. Er ist noch bis ${d.expiresLabel} online.`,
      'Falls noch etwas nicht stimmt, zum Beispiel Leistungen, Texte, Fotos oder Farben, passe ich das vor einer Bestellung kostenlos an. Ein kurzer Satz genügt.',
      { button: { href: d.wishUrl, label: 'Wunsch schicken' } },
      { button: { href: d.demoUrl, label: 'Entwurf ansehen', secondary: true } },
      { small: `Keine E-Mails mehr erhalten: ${d.unsubscribeUrl}` },
    ],
  });
}

export function refundEmail(cfg: AppConfig, d: { name: string; amount: string; cancellationNumber: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `Erstattung Ihrer Zahlung (Stornorechnung ${d.cancellationNumber})`,
    heading: 'Erstattung veranlasst',
    name: d.name,
    blocks: [
      `wir haben ${d.amount} an Sie erstattet. Je nach Zahlungsart sehen Sie den Betrag in wenigen Tagen auf Ihrem Konto bzw. Ihrer Kartenabrechnung.`,
      `Die Stornorechnung ${d.cancellationNumber} finden Sie im Anhang.`,
    ],
  });
}

export function renewalReminderEmail(
  cfg: AppConfig,
  d: { name: string; domain: string | null; hostingUntil: string; subscriptionUrl: string | null },
): EmailContent {
  const price = `${formatEuro(cfg.pricing.subscriptionCents)} pro Monat`;
  const blocks: Block[] = [
    `das im Website-Paket enthaltene Hosting für ${d.domain ?? 'Ihre Website'} läuft am ${d.hostingUntil} aus.`,
  ];
  if (d.subscriptionUrl) {
    blocks.push(
      `Wenn Ihre Website danach online bleiben soll, können Sie „${cfg.pricing.subscriptionName}“ für ${price} buchen (monatlich kündbar). Hosting, SSL, Domain und kleine Textänderungen sind enthalten.`,
      { button: { href: d.subscriptionUrl, label: `${cfg.pricing.subscriptionName} buchen` } },
    );
  } else {
    blocks.push(
      `Wenn Ihre Website danach online bleiben soll, antworten Sie einfach auf diese E-Mail. Wir verlängern dann „${cfg.pricing.subscriptionName}“ für ${price} (monatlich kündbar).`,
    );
  }
  blocks.push(
    'Möchten Sie nicht verlängern, müssen Sie nichts tun. Die Domain gehört Ihnen – auf Wunsch geben wir sie für einen Umzug zu einem anderen Anbieter frei.',
  );
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
    preheader: 'Ansehen, freigeben oder Änderungen wünschen – mit einem Klick.',
    name: d.name,
    blocks: [
      d.firstVersion
        ? 'Ihre Website ist fertig vorbereitet – mit Ihren Angaben, Texten und Bildern. Bitte schauen Sie sich die Vorschau in Ruhe an.'
        : 'wir haben Ihre Änderungswünsche eingearbeitet. Bitte schauen Sie sich die neue Vorschau an.',
      ...(d.summary ? [d.summary] : []),
      { button: { href: d.previewUrl, label: 'Vorschau ansehen' } },
      `Passt alles, geben Sie die Seite mit einem Klick frei – dann registrieren wir Ihre Domain und schalten die Website live. Möchten Sie noch etwas ändern, beschreiben Sie es einfach auf der Vorschauseite (noch ${d.roundsLeft} Änderungsrunde${d.roundsLeft === 1 ? '' : 'n'} inklusive).`,
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
      `Ihre Website ist ab sofort online: ${d.url}`,
      { button: { href: d.url, label: 'Website ansehen' } },
      {
        checks: [
          d.domain
            ? `Die Domain ${d.domain} ist auf Sie registriert und gehört Ihnen.`
            : 'Ihre Website ist unter der oben genannten Adresse erreichbar.',
          `Nachrichten aus dem Kontaktformular gehen an ${d.formTarget}.`,
          d.monthlyOffer
            ? d.monthlyOffer.automatic
              ? `Ihr gewählter Monatstarif von insgesamt ${formatEuro(d.monthlyOffer.amountCents)} wird nach bestätigtem Go-Live über das vereinbarte Zahlungsmittel gestartet. Zahlungsstatus, Tarifwechsel und Kündigung finden Sie über den Verwaltungslink. Die Vorschauzeit bleibt unberechnet.`
              : `Ihr Monatstarif kostet insgesamt ${formatEuro(d.monthlyOffer.amountCents)}. Bitte bestätigen Sie jetzt den separaten Aboabschluss; erst damit beginnt die monatliche Zahlung. Es gibt keine rückwirkende Abbuchung für die Vorschauzeit.`
            : `Hosting und SSL-Verschlüsselung sind bis ${d.hostingUntil} enthalten. Wir erinnern Sie rechtzeitig vor Ablauf.`,
          'Impressum und Datenschutzerklärung stammen aus Ihren Angaben – bitte halten Sie sie aktuell und geben Sie uns Bescheid, wenn sich etwas ändert.',
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
      'Kleine Textänderungen oder neue Öffnungszeiten? Antworten Sie einfach auf diese E-Mail.',
      'Vielen Dank für Ihr Vertrauen!',
    ],
  });
}
