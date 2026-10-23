import type { AppConfig } from '../config/settings';
import { esc } from '../util/html';
import { formatEuro } from '../util/time';

/**
 * Transaktions-Mails. Nur an Personen, die uns ihre Adresse selbst gegeben haben
 * (Checkout, Demo-Formular, Kundenkontakt) – keine Werbung, kein Tracking-Pixel.
 */
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export type Block = string | { button: { href: string; label: string } } | { list: string[] } | { small: string };

function greeting(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  return n ? `Guten Tag ${n},` : 'Guten Tag,';
}

function signatureText(cfg: AppConfig): string {
  const s = cfg.sender;
  return [
    'Viele Grüße',
    s.name,
    '',
    '--',
    s.company,
    `${s.street}, ${s.postalCode} ${s.city}`,
    `Tel. ${s.phone} · ${s.email}`,
    s.website,
  ].join('\n');
}

export function renderEmail(
  cfg: AppConfig,
  input: { subject: string; name?: string | null; blocks: Block[]; noGreeting?: boolean },
): EmailContent {
  const parts: string[] = [];
  const htmlParts: string[] = [];
  if (!input.noGreeting) {
    parts.push(greeting(input.name));
    htmlParts.push(`<p>${esc(greeting(input.name))}</p>`);
  }
  for (const b of input.blocks) {
    if (typeof b === 'string') {
      parts.push(b);
      htmlParts.push(`<p>${esc(b).replace(/\n/g, '<br>')}</p>`);
    } else if ('button' in b) {
      parts.push(`${b.button.label}:\n${b.button.href}`);
      htmlParts.push(
        `<p style="margin:24px 0"><a href="${esc(b.button.href)}" style="display:inline-block;background:#1d4e89;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${esc(b.button.label)}</a></p>` +
          `<p style="font-size:13px;color:#4a5565">Falls der Knopf nicht funktioniert: <a href="${esc(b.button.href)}" style="color:#1d4e89">${esc(b.button.href)}</a></p>`,
      );
    } else if ('list' in b) {
      parts.push(b.list.map((l) => `• ${l}`).join('\n'));
      htmlParts.push(`<ul>${b.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`);
    } else {
      parts.push(b.small);
      htmlParts.push(`<p style="font-size:13px;color:#4a5565">${esc(b.small).replace(/\n/g, '<br>')}</p>`);
    }
  }
  const sig = signatureText(cfg);
  const text = `${parts.join('\n\n')}\n\n${sig}\n`;
  const s = cfg.sender;
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(input.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1d232b;line-height:1.55">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:12px;padding:28px 24px;font-size:15px">
<div style="font-weight:700;color:#1d4e89;font-size:17px;margin-bottom:18px">${esc(s.company)}</div>
${htmlParts.join('\n')}
<p>Viele Grüße<br>${esc(s.name)}</p>
</div>
<p style="font-size:12px;color:#6b7280;margin:16px 8px">${esc(s.company)} · ${esc(s.street)} · ${esc(s.postalCode)} ${esc(s.city)}<br>Tel. ${esc(s.phone)} · ${esc(s.email)} · ${esc(s.website)}</p>
</div></body></html>`;
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
    domain: string | null;
    /** Option B: Ende der Mindestlaufzeit (formatiert) */
    monthlyMinTermEnds?: string | null;
    /** Zufriedenheitsgarantie bis (formatiert) */
    guaranteeUntil?: string | null;
  },
): EmailContent {
  const p = cfg.pricing;
  const terms: Block[] = [];
  if (d.monthlyMinTermEnds)
    terms.push(
      `Sie zahlen ${d.amount} pro Monat, die Mindestlaufzeit endet am ${d.monthlyMinTermEnds}. Danach kostet „${p.subscriptionName}“ automatisch nur noch ${formatEuro(p.subscriptionCents)} pro Monat und ist monatlich kündbar. Für jede Rate erhalten Sie eine eigene Rechnung.`,
    );
  if (d.guaranteeUntil)
    terms.push(
      `Zufriedenheitsgarantie: Sind Sie nicht zufrieden, antworten Sie bis zum ${d.guaranteeUntil} auf diese E-Mail – Sie bekommen Ihr Geld zurück${d.monthlyMinTermEnds ? ' und der Vertrag endet' : ''}.`,
    );
  return renderEmail(cfg, {
    subject: `Ihre Bestellung: ${d.monthlyMinTermEnds ? p.monthlyName : p.packageName} für ${d.company} (Rechnung ${d.invoiceNumber})`,
    name: d.name,
    blocks: [
      `vielen Dank für Ihre Bestellung – die Zahlung über ${d.amount} ist eingegangen. Die Rechnung ${d.invoiceNumber} finden Sie im Anhang.`,
      ...terms,
      'Damit Ihre Website online gehen kann, brauchen wir noch ein paar Angaben von Ihnen: Impressum, gegebenenfalls Logo und Fotos, Ihre Leistungen und Öffnungszeiten. Das dauert etwa 10 Minuten.',
      { button: { href: d.onboardingUrl, label: 'Angaben für die Website eintragen' } },
      {
        list: [
          'Sie tragen Ihre Angaben ein (der Link bleibt gültig, Sie können jederzeit weitermachen).',
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
    name: d.name ?? '',
    blocks: [
      `vielen Dank für Ihre Nachricht zu Ihrem Website-Entwurf. Kurz zur Erinnerung: Der Entwurf ist noch bis ${d.expiresLabel} online, danach wird er automatisch gelöscht.`,
      { button: { href: d.demoUrl, label: 'Entwurf ansehen' } },
      'Haben Sie noch Fragen? Antworten Sie einfach auf diese E-Mail. Dies ist die einzige Erinnerung – wir schreiben Ihnen danach nicht mehr.',
      { small: `Keine Erinnerungen mehr erhalten: ${d.unsubscribeUrl}` },
    ],
  });
}

export function refundEmail(cfg: AppConfig, d: { name: string; amount: string; cancellationNumber: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `Erstattung Ihrer Zahlung (Stornorechnung ${d.cancellationNumber})`,
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
    name: d.name,
    blocks,
  });
}

export function adminNotificationEmail(cfg: AppConfig, d: { title: string; lines: string[]; link?: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `[Website-Brief] ${d.title}`,
    noGreeting: true,
    blocks: [...d.lines, ...(d.link ? [{ button: { href: d.link, label: 'Im Dashboard öffnen' } }] : [])],
  });
}

export function previewReadyEmail(
  cfg: AppConfig,
  d: { name: string; previewUrl: string; summary: string | null; roundsLeft: number; firstVersion: boolean },
): EmailContent {
  return renderEmail(cfg, {
    subject: d.firstVersion ? 'Ihre Website-Vorschau ist fertig' : 'Ihre geänderte Website-Vorschau ist fertig',
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
  d: { name: string; url: string; domain: string | null; hostingUntil: string; formTarget: string },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihre Website ist online: ${d.domain ?? d.url}`,
    name: d.name,
    blocks: [
      `Ihre Website ist ab sofort online: ${d.url}`,
      {
        list: [
          d.domain
            ? `Die Domain ${d.domain} ist auf Sie registriert und gehört Ihnen.`
            : 'Ihre Website ist unter der oben genannten Adresse erreichbar.',
          `Nachrichten aus dem Kontaktformular gehen an ${d.formTarget}.`,
          `Hosting und SSL-Verschlüsselung sind bis ${d.hostingUntil} enthalten. Wir erinnern Sie rechtzeitig vor Ablauf.`,
          'Impressum und Datenschutzerklärung stammen aus Ihren Angaben – bitte halten Sie sie aktuell und geben Sie uns Bescheid, wenn sich etwas ändert.',
        ],
      },
      'Kleine Textänderungen oder neue Öffnungszeiten? Antworten Sie einfach auf diese E-Mail.',
      'Vielen Dank für Ihr Vertrauen!',
    ],
  });
}
