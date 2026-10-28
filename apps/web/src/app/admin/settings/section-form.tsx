'use client';

import { useActionState } from 'react';
import type { FieldDef } from './fields';
import type { SaveState } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

const input =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none';

export interface SectionFormProps {
  fields: (FieldDef & { value: unknown })[];
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
}

function display(f: FieldDef & { value: unknown }): string {
  const v = f.value;
  if (f.type === 'euro') return typeof v === 'number' ? (v / 100).toFixed(2).replace('.', ',') : '';
  if (f.type === 'lines') return Array.isArray(v) ? v.join('\n') : '';
  if (f.type === 'json') return JSON.stringify(v ?? null, null, 2);
  return v === undefined || v === null ? '' : String(v);
}

export function SectionForm({ fields, action }: SectionFormProps) {
  const [state, formAction] = useActionState<SaveState, FormData>(action, {});
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `f-${f.path}`;
        const wide = ['textarea', 'json', 'lines', 'multi'].includes(f.type);
        return (
          <div key={f.path} className={wide ? 'sm:col-span-2' : ''}>
            {f.type === 'bool' ? (
              <label className="flex items-center gap-2 text-sm" htmlFor={id}>
                <input id={id} type="checkbox" name={f.path} defaultChecked={Boolean(f.value)} className="h-4 w-4" />
                {f.label}
              </label>
            ) : f.type === 'multi' ? (
              <fieldset>
                <legend className="mb-1 block text-xs font-medium text-slate-600">{f.label}</legend>
                <div className="flex flex-wrap gap-3">
                  {(f.options ?? []).map((o) => (
                    <label key={o} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        name={f.path}
                        value={o}
                        defaultChecked={Array.isArray(f.value) && f.value.includes(o)}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <>
                <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
                  {f.label}
                </label>
                {['textarea', 'json', 'lines'].includes(f.type) ? (
                  <textarea
                    id={id}
                    name={f.path}
                    defaultValue={display(f)}
                    rows={f.type === 'textarea' ? 10 : f.type === 'json' ? 8 : 5}
                    className={`${input} font-mono text-xs`}
                  />
                ) : (
                  <input
                    id={id}
                    name={f.path}
                    type={f.type === 'email' ? 'email' : 'text'}
                    inputMode={f.type === 'number' || f.type === 'euro' ? 'decimal' : undefined}
                    defaultValue={display(f)}
                    className={input}
                  />
                )}
              </>
            )}
            {f.hint ? <p className="mt-1 text-xs text-slate-500">{f.hint}</p> : null}
          </div>
        );
      })}
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton className="ui-btn ui-btn-primary">Speichern</SubmitButton>
        {state.ok ? (
          <span className="text-sm text-emerald-700" role="status">
            Gespeichert.
          </span>
        ) : null}
        {state.error ? (
          <span className="text-sm text-red-700" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
