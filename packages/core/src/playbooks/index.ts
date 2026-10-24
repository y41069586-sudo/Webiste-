import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import type { BranchConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { playbooks } from '../db/schema';
import { foldUmlauts } from '../leads/normalize';
import type { RawPlace } from '../providers/types';
import { INDUSTRIES, type BranchGroup, type Industry } from '../types';

/**
 * Branchen-Playbooks (Update 2, B3): Zuordnung zu Google-/OSM-Typen, Aufhänger, erlaubte Claims,
 * Demo-Schwerpunkte. Dateien unter packages/core/playbooks/{branche}.yaml, Ausschlüsse in
 * _ausschluss.yaml.
 */

const osmTag = z.string().regex(/^[a-z_:]+=[a-z0-9_*:;-]+$/);

export const playbookSchema = z.object({
  id: z.enum(INDUSTRIES),
  label: z.string(),
  /** kleiner = wird bei mehrdeutigen Treffern zuerst gewählt */
  priority: z.number().int(),
  fallback: z.boolean().default(false),
  google_types: z.array(z.string().regex(/^[a-z_*]+$/)),
  osm_tags: z.array(osmTag),
  hook: z.string().min(5),
  allowed_claims: z.array(z.string().regex(/^[A-Z0-9_]+$/)),
  demo_sections: z.array(z.string().regex(/^[a-z_]+$/)).min(1),
  letter: z.object({
    qr_label: z.string().min(5),
    start_variants: z.array(z.string()).min(1),
  }),
});
export type Playbook = z.infer<typeof playbookSchema>;

export const exclusionSchema = z.object({
  google_types: z.array(z.string().regex(/^[a-z_*]+$/)),
  google_types_allow: z.array(z.string()).default([]),
  osm_tags: z.array(osmTag),
  name_patterns: z.array(z.string()),
});
export type ExclusionRules = z.infer<typeof exclusionSchema>;

export function playbooksDir(): string {
  if (process.env.PLAYBOOKS_DIR) return process.env.PLAYBOOKS_DIR;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', '..', 'playbooks');
}

interface Loaded {
  dir: string;
  playbooks: Playbook[];
  exclusion: ExclusionRules;
  namePatterns: RegExp[];
}
let cache: Loaded | undefined;

function load(dir = playbooksDir()): Loaded {
  if (cache?.dir === dir) return cache;
  if (!existsSync(dir)) throw new Error(`Playbook-Ordner fehlt (${dir}).`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
  const list: Playbook[] = [];
  let exclusion: ExclusionRules | undefined;
  for (const f of files) {
    const raw: unknown = parse(readFileSync(path.join(dir, f), 'utf8'));
    if (f === '_ausschluss.yaml') {
      exclusion = exclusionSchema.parse(raw);
      continue;
    }
    const pb = playbookSchema.parse(raw);
    if (`${pb.id}.yaml` !== f) throw new Error(`Playbook ${f}: id „${pb.id}“ passt nicht zum Dateinamen.`);
    list.push(pb);
  }
  if (!exclusion) throw new Error('Playbook-Ordner: _ausschluss.yaml fehlt.');
  const missing = INDUSTRIES.filter((i) => !list.some((p) => p.id === i));
  if (missing.length) throw new Error(`Playbooks fehlen: ${missing.join(', ')}`);
  if (list.filter((p) => p.fallback).length !== 1) throw new Error('Genau ein Playbook muss fallback: true haben.');
  list.sort((a, b) => a.priority - b.priority);
  cache = {
    dir,
    playbooks: list,
    exclusion,
    namePatterns: exclusion.name_patterns.map((p) => new RegExp(p, 'i')),
  };
  return cache;
}

export function getPlaybooks(): Playbook[] {
  return load().playbooks;
}

export function getPlaybook(id: Industry): Playbook {
  const pb = load().playbooks.find((p) => p.id === id);
  if (!pb) throw new Error(`Playbook ${id} nicht gefunden.`);
  return pb;
}

export function getExclusionRules(): ExclusionRules {
  return load().exclusion;
}

function globMatch(pattern: string, value: string): boolean {
  if (!pattern.includes('*')) return pattern === value;
  const re = new RegExp(`^${pattern.split('*').map(escapeRe).join('.*')}$`);
  return re.test(value);
}
function escapeRe(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function osmMatch(rule: string, tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  const [key, value] = rule.split('=') as [string, string];
  const v = tags[key];
  if (v === undefined) return false;
  if (value === '*') return true;
  // OSM erlaubt Mehrfachwerte mit Semikolon („cafe;bakery“)
  return v.split(';').some((x) => x.trim() === value);
}

function googleTypes(place: RawPlace): string[] {
  if (place.source !== 'google_places' && place.source !== 'mock') return [];
  return [place.primaryType, ...(place.types ?? [])].filter((t): t is string => Boolean(t));
}

export interface ExclusionHit {
  kind: 'google_type' | 'osm_tag' | 'name';
  match: string;
}

/** Ausgeschlossene Branche (Gesundheit, Recht)? Prüft Google-Typen, OSM-Tags und Namen. */
export function exclusionFor(place: RawPlace): ExclusionHit | null {
  const { exclusion, namePatterns } = load();
  for (const t of googleTypes(place)) {
    if (exclusion.google_types_allow.includes(t)) continue;
    const rule = exclusion.google_types.find((g) => globMatch(g, t));
    if (rule) return { kind: 'google_type', match: t };
  }
  for (const rule of exclusion.osm_tags) {
    if (osmMatch(rule, place.osmTags)) return { kind: 'osm_tag', match: rule };
  }
  const name = foldUmlauts(place.name);
  for (const re of namePatterns) {
    if (re.test(name)) return { kind: 'name', match: re.source };
  }
  return null;
}

/** Standard-Branche einer Suchbranche (Template-Gruppe), falls sie keine eigene angibt. */
const GROUP_INDUSTRY: Record<BranchGroup, Industry> = {
  handwerk: 'handwerk',
  beauty: 'beauty',
  gastronomie: 'gastronomie',
  einzelhandel: 'einzelhandel',
  kurse: 'kurse_training',
};

export function branchIndustry(branch: Pick<BranchConfig, 'group' | 'industry'>): Industry {
  return branch.industry ?? GROUP_INDUSTRY[branch.group];
}

/**
 * Playbook-Zuordnung eines Treffers: zuerst nach den Merkmalen des Betriebs (OSM-Tags,
 * Google-Typen) in Prioritätsreihenfolge, sonst die Branche der Suche, sonst der Fallback.
 */
export function classifyIndustry(place: RawPlace, branch?: Pick<BranchConfig, 'group' | 'industry'>): Industry {
  const list = load().playbooks;
  const types = googleTypes(place);
  const byFeature = list.find(
    (p) =>
      !p.fallback &&
      (p.osm_tags.some((r) => osmMatch(r, place.osmTags)) || types.some((t) => p.google_types.some((g) => globMatch(g, t)))),
  );
  if (byFeature) return byFeature.id;
  if (branch) return branchIndustry(branch);
  return list.find((p) => p.fallback)!.id;
}

/** Playbooks in die Tabelle spiegeln (für Dashboard und Lern-Agent, B7). Idempotent. */
export async function syncPlaybooks(db: DbOrTx = getDb()): Promise<number> {
  const list = getPlaybooks();
  for (const p of list) {
    const values = {
      branche: p.label,
      googleTypes: p.google_types,
      hook: p.hook,
      allowedClaimIds: p.allowed_claims,
      demoSections: p.demo_sections,
      definition: p as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    };
    await db
      .insert(playbooks)
      .values({ id: p.id, ...values })
      .onConflictDoUpdate({ target: playbooks.id, set: values });
  }
  return list.length;
}

/** Nur für Tests: Cache leeren (andere Verzeichnisse). */
export function resetPlaybookCache(): void {
  cache = undefined;
}
