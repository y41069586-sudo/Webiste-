import { isV4Tier, V4_PRICES } from '../services/offers-v4';
import { sql } from 'drizzle-orm';
import type { InvoiceData } from '@wbm/templates/letter-types';
import type { AppConfig } from '../config/settings';
import type { DbOrTx } from '../db/client';
import type { BillingAddress } from '../db/schema';
import type { OrderPlan } from '../types';
import { formatDateDe, formatEuro } from '../util/time';

export interface Amounts {
  grossCents: number;
  netCents: number;
  vatCents: number;
  vatRatePercent: number;
}

/** Zusatz zu Preisangaben in Werbung/Checkout: leer (Kleinunternehmer), „inkl. USt.“ oder „zzgl. USt.“ */
export function priceTaxSuffix(cfg: AppConfig): string {
  if (cfg.tax.kleinunternehmer || cfg.tax.vatRatePercent === 0) return '';
  return cfg.tax.pricesAreGross ? 'inkl. USt.' : 'zzgl. USt.';
}

/** Beträge aus der Config: Kleinunternehmer ohne USt, sonst Brutto/Netto je nach `pricesAreGross`. */
export function packageAmounts(cfg: AppConfig): Amounts {
  return amountsFor(cfg, cfg.pricing.packageCents);
}

/** Beträge des gewählten Plans (Option A: Einmalpreis; Option B: erste Monatsrate). */
export function planAmounts(cfg: AppConfig, plan: OrderPlan): Amounts {
  return amountsFor(
    cfg,
    isV4Tier(plan) ? V4_PRICES.setupCents : plan === 'monthly' ? cfg.pricing.monthlyCents : cfg.pricing.packageCents,
  );
}

export function amountsFor(cfg: AppConfig, base: number): Amounts {
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
  plan?: OrderPlan;
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
  opts: {
    number: string;
    paidAt: Date;
    issuedAt: Date;
    amounts: Amounts;
    /**
     * Wiederkehrende Zahlung mit Leistungszeitraum: Plan „monthly“ Rate n (Standard bei Plan „monthly“:
     * erste Rate ab Zahlung) bzw. „Hosting & Pflege“ (kind care)
     */
    rate?: { sequence: number; periodStart: Date; periodEnd: Date; kind?: 'monthly' | 'care' };
  },
): InvoiceData {
  const a = opts.amounts;
  const s = cfg.sender;
  const domain = order.domainWish ? ` (Domain: ${order.domainWish})` : '';
  const paid = formatDateDe(opts.paidAt);
  const monthly = order.plan === 'monthly';
  const rate =
    opts.rate ?? (monthly ? { sequence: 1, periodStart: opts.paidAt, periodEnd: addOneMonth(opts.paidAt) } : undefined);
  const p = cfg.pricing;
  const inMinTerm = rate ? rate.kind !== 'care' && monthly && rate.sequence <= p.minTermMonths : false;
  const line = rate
    ? {
        title: inMinTerm
          ? `${p.monthlyName}${domain} – Monatsrate ${rate.sequence} von ${p.minTermMonths}`
          : `${p.subscriptionName}${domain}`,
        description: inMinTerm
          ? `${p.packageDescription} Mindestlaufzeit ${p.minTermMonths} Monate, danach ${p.subscriptionName} für ${formatEuro(p.subscriptionCents)}/Monat, monatlich kündbar.`
          : `Hosting, SSL und Pflege Ihrer Website, monatlich kündbar.`,
      }
    : { title: `${p.packageName}${domain}`, description: p.packageDescription };
  if (isV4Tier(order.plan ?? '')) {
    const care = order.plan === 'care_plus';
    line.title = `SeitenWerk ${care ? 'Care+' : 'Basis'}${domain}${rate ? ' – Monatstarif' : ' – Einrichtung'}`;
    line.description = rate
      ? `Domain, Hosting, SSL und technische Betreuung${care ? '; zusätzlich bis zu 60 Minuten kleine Inhaltsänderungen im Monat' : '; Inhaltsänderungen separat nach Freigabe'}. Monatlich kündbar. Keine weitere Basisgebühr.`
      : 'Erstellung und Einrichtung der Website. Monatsabrechnung beginnt erst nach bestätigtem Go-Live gemäß vereinbartem Tarif; kein Hosting-Jahrespaket im Einrichtungspreis.';
  }
  return {
    kind: 'invoice',
    number: opts.number,
    issueDate: formatDateDe(opts.issuedAt),
    serviceDate: rate
      ? `Leistungszeitraum ${formatDateDe(rate.periodStart)} bis ${formatDateDe(new Date(rate.periodEnd.getTime() - 86400_000))}; Entgelt vereinnahmt am ${paid}.`
      : isV4Tier(order.plan ?? '')
        ? `Entgelt vereinnahmt am ${paid}; Leistungszeitraum: Erstellung und Einrichtung ab ${paid}.`
        : `Entgelt vereinnahmt am ${paid}; Leistungszeitraum: Erstellung ab ${paid}, Hosting ${p.hostingMonthsIncluded} Monate ab Veröffentlichung.`,
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
        title: line.title,
        description: line.description,
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

function addOneMonth(d: Date): Date {
  const x = new Date(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + 1);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return x;
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
