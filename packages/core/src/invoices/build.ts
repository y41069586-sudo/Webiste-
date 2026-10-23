import { sql } from 'drizzle-orm';
import type { InvoiceData } from '@wbm/templates/letter-types';
import type { AppConfig } from '../config/settings';
import type { DbOrTx } from '../db/client';
import type { BillingAddress } from '../db/schema';
import { formatDateDe, formatEuro } from '../util/time';

export interface Amounts {
  grossCents: number;
  netCents: number;
  vatCents: number;
  vatRatePercent: number;
}

/** Beträge aus der Config: Kleinunternehmer ohne USt, sonst Brutto/Netto je nach `pricesAreGross`. */
export function packageAmounts(cfg: AppConfig): Amounts {
  const base = cfg.pricing.packageCents;
  if (cfg.tax.kleinunternehmer || cfg.tax.vatRatePercent === 0) {
    return { grossCents: base, netCents: base, vatCents: 0, vatRatePercent: 0 };
  }
  const r = cfg.tax.vatRatePercent / 100;
  if (cfg.tax.pricesAreGross) {
    const net = Math.round(base / (1 + r));
    return { grossCents: base, netCents: net, vatCents: base - net, vatRatePercent: cfg.tax.vatRatePercent };
  }
  const vat = Math.round(base * r);
  return { grossCents: base + vat, netCents: base, vatCents: vat, vatRatePercent: cfg.tax.vatRatePercent };
}

/** Beträge, wie sie bei der Bestellung festgelegt wurden. */
export function orderAmounts(o: { amountCents: number; netCents: number; vatCents: number; vatRatePercent: number }): Amounts {
  return { grossCents: o.amountCents, netCents: o.netCents, vatCents: o.vatCents, vatRatePercent: o.vatRatePercent };
}

/**
 * Nächste fortlaufende Rechnungsnummer (z. B. RE-2026-0001). Läuft in der Transaktion der
 * Zahlungsbuchung: bricht diese ab, wird auch die Nummer nicht verbraucht (keine Lücken).
 */
export async function nextInvoiceNumber(tx: DbOrTx, cfg: AppConfig, at: Date): Promise<string> {
  const year = Number(new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: 'Europe/Berlin' }).format(at));
  const res = await tx.execute<{ value: number }>(sql`
    INSERT INTO counters (name, value) VALUES (${`invoice:${year}`}, 1)
    ON CONFLICT (name) DO UPDATE SET value = counters.value + 1
    RETURNING value
  `);
  const n = res.rows[0]!.value;
  return `${cfg.tax.invoicePrefix}-${year}-${String(n).padStart(4, '0')}`;
}

export interface InvoiceOrder {
  id: string;
  amountCents: number;
  customerCompany: string;
  customerName: string;
  billingAddressJson: BillingAddress;
  domainWish: string | null;
}

/** Unveränderlicher Rechnungsstand (wird am Auftrag gespeichert und daraus das PDF erzeugt). */
export function buildInvoiceData(
  cfg: AppConfig,
  order: InvoiceOrder,
  opts: { number: string; paidAt: Date; issuedAt: Date; amounts: Amounts },
): InvoiceData {
  const a = opts.amounts;
  const s = cfg.sender;
  const domain = order.domainWish ? ` (Domain: ${order.domainWish})` : '';
  const paid = formatDateDe(opts.paidAt);
  return {
    kind: 'invoice',
    number: opts.number,
    issueDate: formatDateDe(opts.issuedAt),
    serviceDate: `Entgelt vereinnahmt am ${paid}; Leistungszeitraum: Erstellung ab ${paid}, Hosting ${cfg.pricing.hostingMonthsIncluded} Monate ab Veröffentlichung.`,
    orderRef: order.id.slice(0, 8).toUpperCase(),
    seller: {
      name: s.name,
      company: s.company,
      street: s.street,
      postalCode: s.postalCode,
      city: s.city,
      email: s.email,
      phone: s.phone,
      website: s.website,
      taxNumber: s.taxNumber,
      vatId: s.vatId,
      bankName: s.bankName,
      bankIban: s.bankIban,
      bankBic: s.bankBic,
    },
    buyer: {
      company: order.customerCompany,
      name: order.customerName,
      street: order.billingAddressJson.street,
      postalCode: order.billingAddressJson.postalCode,
      city: order.billingAddressJson.city,
      country: order.billingAddressJson.country,
    },
    lines: [
      {
        quantity: 1,
        title: `${cfg.pricing.packageName}${domain}`,
        description: cfg.pricing.packageDescription,
        unitPrice: formatEuro(a.netCents),
        total: formatEuro(a.netCents),
      },
    ],
    net: formatEuro(a.netCents),
    vatLabel: a.vatCents ? `Umsatzsteuer ${a.vatRatePercent} %` : null,
    vat: a.vatCents ? formatEuro(a.vatCents) : null,
    gross: formatEuro(a.grossCents),
    taxNote: a.vatCents ? null : cfg.tax.kleinunternehmerNote,
    paymentNote: `Der Rechnungsbetrag wurde am ${paid} per Online-Zahlung beglichen. Es ist kein Betrag mehr offen.`,
  };
}

/** Stornorechnung zur ursprünglichen Rechnung (negative Beträge, eigene fortlaufende Nummer). */
export function buildCancellationData(
  original: InvoiceData,
  opts: { number: string; issuedAt: Date; refundedCents: number; amounts: Amounts },
): InvoiceData {
  const full = opts.refundedCents >= opts.amounts.grossCents;
  const ratio = full ? 1 : opts.refundedCents / opts.amounts.grossCents;
  const gross = full ? opts.amounts.grossCents : opts.refundedCents;
  const vat = Math.round(opts.amounts.vatCents * ratio);
  const net = gross - vat;
  return {
    ...original,
    kind: 'cancellation',
    number: opts.number,
    originalNumber: original.number,
    originalDate: original.issueDate,
    issueDate: formatDateDe(opts.issuedAt),
    lines: original.lines.map((l) => ({
      ...l,
      title: `${full ? 'Storno' : 'Teilerstattung'}: ${l.title}`,
      unitPrice: formatEuro(-net),
      total: formatEuro(-net),
    })),
    net: formatEuro(-net),
    vat: vat ? formatEuro(-vat) : null,
    gross: formatEuro(-gross),
    paymentNote: `Der Betrag von ${formatEuro(gross)} wurde am ${formatDateDe(opts.issuedAt)} auf das ursprüngliche Zahlungsmittel erstattet.`,
  };
}
