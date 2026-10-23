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

export function renderEmail(cfg: AppConfig, input: { subject: string; name?: string | null; blocks: Block[]; noGreeting?: boolean }): EmailContent {
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
  d: { name: string; company: string; invoiceNumber: string; amount: string; onboardingUrl: string; domain: string | null },
): EmailContent {
  return renderEmail(cfg, {
    subject: `Ihre Bestellung: ${cfg.pricing.packageName} für ${d.company} (Rechnung ${d.invoiceNumber})`,
    name: d.name,
    blocks: [
      `vielen Dank für Ihre Bestellung – die Zahlung über ${d.amount} ist eingegangen. Die Rechnung ${d.invoiceNumber} finden Sie im Anhang.`,
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
  return renderEmail(cfg, { subject: `Ihr Hosting für ${d.domain ?? 'Ihre Website'} läuft am ${d.hostingUntil} aus`, name: d.name, blocks });
}

export function adminNotificationEmail(cfg: AppConfig, d: { title: string; lines: string[]; link?: string }): EmailContent {
  return renderEmail(cfg, {
    subject: `[Website-Brief] ${d.title}`,
    noGreeting: true,
    blocks: [...d.lines, ...(d.link ? [{ button: { href: d.link, label: 'Im Dashboard öffnen' } }] : [])],
  });
}
