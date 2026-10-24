import Link from 'next/link';
import type { SitePricing } from '@/lib/site';
import { Check, delay } from './section';

/** Zwei gleichwertige Preiskarten – keine Vorauswahl, keine versteckten Kosten. */
export function PriceCards({ p }: { p: SitePricing }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div data-reveal className="card-site card-hover p-7 sm:p-9">
          <p className="font-tight text-nav text-[#555555]">Einmalig</p>
          <p className="text-editor mt-3 text-[#222222]">{p.oneTime}</p>
          <ul className="mt-7 space-y-3 border-t border-[#eeeeee] pt-6 text-[#333333]">
            <Check>Website, eigene Domain und {p.hostingMonths} Monate Hosting inklusive</Check>
            <Check>Danach optional {p.follow}/Monat für Hosting &amp; Pflege, monatlich kündbar</Check>
          </ul>
        </div>
        {p.monthlyEnabled ? (
          <div data-reveal style={delay(100)} className="card-site card-hover p-7 sm:p-9">
            <p className="font-tight text-nav text-[#555555]">Monatlich</p>
            <p className="text-editor mt-3 text-[#222222]">
              {p.monthly}
              <span className="ml-2 align-baseline text-base font-normal tracking-normal text-[#555555]">/Monat</span>
            </p>
            <ul className="mt-7 space-y-3 border-t border-[#eeeeee] pt-6 text-[#333333]">
              <Check>{p.minTerm} Monate Mindestlaufzeit</Check>
              <Check>
                Ab Monat {p.followFromMonth} nur noch {p.follow}/Monat, dann monatlich kündbar
              </Check>
            </ul>
          </div>
        ) : null}
      </div>
      <p data-reveal className="mt-6 text-sm text-[#555555]">
        Endpreise, keine Einrichtungsgebühr.{' '}
        <Link href="/preise" className="text-[#222222] underline underline-offset-4">
          Alle Details zu den Preisen
        </Link>
      </p>
    </div>
  );
}
