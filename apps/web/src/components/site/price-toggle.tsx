'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface PlanView {
  key: 'one_time' | 'monthly';
  label: string;
  price: string;
  unit: string;
  note: string;
  points: string[];
}

/** Preiskarte mit sanftem Umschalter „Einmalig“ / „Monatlich“ und animiertem Preiswechsel. */
export function PriceToggle({ plans, cta }: { plans: PlanView[]; cta: { href: string; label: string } }) {
  const [key, setKey] = useState<PlanView['key']>(plans[0]!.key);
  const plan = plans.find((p) => p.key === key) ?? plans[0]!;
  const idx = plans.findIndex((p) => p.key === key);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:items-start">
      <div>
        <div
          role="radiogroup"
          aria-label="Zahlweise"
          className="relative grid w-full max-w-sm grid-cols-2 rounded-[8px] bg-white p-1"
        >
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-[6px] bg-[#222222] transition-transform duration-500"
            style={{ transform: `translateX(${idx * 100}%)`, transitionTimingFunction: 'var(--ease-smooth)' }}
          />
          {plans.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={p.key === key}
              onClick={() => setKey(p.key)}
              className={`font-tight relative z-10 rounded-[6px] px-4 py-3 text-[0.95rem] font-medium transition-colors duration-500 ${p.key === key ? 'text-white' : 'text-[#333333]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-5 max-w-[36ch] text-sm leading-relaxed text-[#555555]">
          Beide Wege sind gleichwertig. Umschalten zeigt die Details – vorausgewählt wird beim Kauf nichts.
        </p>
      </div>
      <div className="card-site overflow-hidden p-7 sm:p-10">
        <div key={plan.key} className="price-in">
          <p className="font-tight text-nav text-[#555555]">{plan.label}</p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-hero text-[#222222] tabular-nums">{plan.price}</span>
            <span className="text-[#555555]">{plan.unit}</span>
          </p>
          <p className="mt-3 text-[#333333]">{plan.note}</p>
          <ul className="mt-8 grid gap-3 border-t border-[#eeeeee] pt-6 text-[#333333] sm:grid-cols-2">
            {plan.points.map((pt) => (
              <li key={pt} className="flex gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#222222]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {pt}
              </li>
            ))}
          </ul>
        </div>
        <Link href={cta.href} className="btn-site btn-primary mt-9">
          {cta.label}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="arrow h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
