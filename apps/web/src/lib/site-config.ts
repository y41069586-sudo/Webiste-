import 'server-only';
import { appConfigSchema, DEFAULT_CONFIG, deepMerge, getConfig, getEnv, sourcesPageClaims } from '@wbm/core';
import { OPERATOR_PROFILE } from '../../../../packages/core/src/config/operator';
import project from '../../../../supabase/project.json';

/** Der statische Firmenexport braucht keinen direkten Datenbankzugang und keine privaten Schlüssel. */
export async function getSiteConfig() {
  if (!getEnv().SITE_STATIC) return getConfig();
  const fallback = deepMerge(DEFAULT_CONFIG, { sender: OPERATOR_PROFILE });
  const url = process.env.SUPABASE_URL || project.url;
  const response = await fetch(`${url}/functions/v1/seitenwerk-site-config`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Die Website-Einstellungen konnten nicht geladen werden.');
  const data = await response.json();
  return appConfigSchema.parse(deepMerge(fallback, data));
}

interface PublicSource {
  id: string;
  textDe: string;
  footnoteDe: string;
  sourcePublisher: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedAt: Date;
  sample: number | null;
  population: string | null;
  inUse: boolean;
}

export async function getSiteSources(): Promise<PublicSource[]> {
  if (!getEnv().SITE_STATIC) return sourcesPageClaims();
  const response = await fetch(`${process.env.SUPABASE_URL || project.url}/functions/v1/seitenwerk-site-config?view=sources`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Quellen konnten nicht geladen werden.');
  const rows = (await response.json()) as (Omit<PublicSource, 'publishedAt'> & { publishedAt: string })[];
  return rows.map((row) => ({ ...row, publishedAt: new Date(row.publishedAt) }));
}
