/**
 * Supabase-Umzug (11.11.2026): kopiert alle Dateien in den Bucket des neuen Projekts (NEW_S3_*). Sicherungen unter
 * backups/ werden nicht kopiert. Nur lesen bei den Quellen, schreiben beim neuen Projekt; nichts wird gelöscht. Gibt nur
 * Zählwerte aus, keine Schlüssel oder Objektnamen.
 *
 * 15.11.2026: Der Speicher des alten Projekts ist wegen des überschrittenen Kontingents gesperrt (HTTP 402). Quelle sind
 * deshalb zuerst die lokalen nächtlichen Sicherungen auf dem Server (OLD_BACKUP_DIRS, älteste zuerst, neuere überschreiben)
 * und nur ergänzend der alte Speicher, falls er antwortet. Am Ende wird gegen die Datenbank geprüft, wie viele benötigte
 * Dateien (Demo-Seiten, Screenshots, Brief-PDFs, Kundenbilder) im neuen Speicher fehlen.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} fehlt`);
  return v;
};
const client = (endpoint: string, region: string, id: string, secret: string) =>
  new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    maxAttempts: 2,
    credentials: { accessKeyId: id, secretAccessKey: secret },
  });

const bucket = need('S3_BUCKET');
// Wie die App: ohne S3_REGION gilt eu-central-1 (14.11.2026: erster Lauf brach hier mit „S3_REGION fehlt“ ab)
const oldC = client(
  need('S3_ENDPOINT'),
  process.env.S3_REGION || 'eu-central-1',
  need('S3_ACCESS_KEY_ID'),
  need('S3_SECRET_ACCESS_KEY'),
);
const newC = client(
  need('NEW_S3_ENDPOINT'),
  need('NEW_S3_REGION'),
  need('NEW_S3_ACCESS_KEY_ID'),
  need('NEW_S3_SECRET_ACCESS_KEY'),
);

async function listAll(c: S3Client): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const r = await c.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key) out.set(o.Key, o.Size ?? 0);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

type Source = { size: number; load: () => Promise<Buffer> };

/** Lokale Sicherungen: manifest.json + <sha256>.bin je Datei (siehe services/storage-backup.ts). */
async function backupSources(): Promise<{ map: Map<string, Source>; dirs: number }> {
  const map = new Map<string, Source>();
  const dirs = (process.env.OLD_BACKUP_DIRS ?? '').split(':').filter(Boolean);
  let used = 0;
  for (const dir of dirs) {
    let manifest: { entries?: { key: string; file: string; bytes: number }[] };
    try {
      manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
    } catch {
      continue; // unvollständige Sicherung überspringen
    }
    if (!Array.isArray(manifest.entries)) continue;
    used++;
    for (const e of manifest.entries) {
      if (!e.key || e.key.startsWith('backups/') || !/^[a-f0-9]{64}\.bin$/.test(e.file)) continue;
      const file = path.join(dir, e.file);
      map.set(e.key, { size: e.bytes, load: () => readFile(file) });
    }
  }
  return { map, dirs: used };
}

/** Dateien, die laut Datenbank gebraucht werden (alte Datenbank, nur lesen). */
async function neededKeys(): Promise<{ all: Set<string>; demoPages: Set<string> }> {
  const all = new Set<string>();
  const demoPages = new Set<string>();
  const url = process.env.DATABASE_URL;
  if (!url) return { all, demoPages };
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const demos = await c.query<{ h: string | null; d: string | null; m: string | null; c: string | null }>(
      `SELECT html_storage_key h, screenshot_desktop_key d, screenshot_mobile_key m, composite_key c
       FROM demos WHERE status IN ('published','pending_review','approved')`,
    );
    for (const r of demos.rows) {
      if (r.h) {
        all.add(r.h);
        demoPages.add(r.h);
      }
      for (const k of [r.d, r.m, r.c]) if (k) all.add(k);
    }
    const letters = await c.query<{ k: string | null }>(
      `SELECT pdf_storage_key k FROM letters WHERE pdf_storage_key IS NOT NULL`,
    );
    for (const r of letters.rows) if (r.k) all.add(r.k);
    const sites = await c.query<{ v: string }>(
      `SELECT a.value AS v FROM sites, jsonb_each_text(coalesce(sites.asset_keys, '{}'::jsonb)) AS a`,
    );
    for (const r of sites.rows) if (r.v) all.add(r.v);
  } finally {
    await c.end();
  }
  return { all, demoPages };
}

let step = 'Start';
try {
  step = 'Bucket im neuen Projekt prüfen/anlegen';
  try {
    await newC.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await newC.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  step = 'Lokale Sicherungen lesen';
  const { map: sources, dirs } = await backupSources();
  console.log(`  Lokale Sicherungen: ${dirs}, darin ${sources.size} Dateien`);
  step = 'Alten Speicher abfragen';
  let oldReachable = true;
  try {
    for (const [key, size] of await listAll(oldC)) {
      if (key.startsWith('backups/') || sources.has(key)) continue;
      sources.set(key, {
        size,
        load: async () => {
          const res = await oldC.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
          return Buffer.from((await res.Body?.transformToByteArray()) ?? new Uint8Array());
        },
      });
    }
  } catch {
    oldReachable = false;
    console.log('  Alter Speicher nicht erreichbar (gesperrt) – es werden nur die lokalen Sicherungen verwendet.');
  }
  if (!sources.size) throw new Error('Keine Quelle: weder lokale Sicherung noch alter Speicher verfügbar.');
  step = 'Dateien im neuen Projekt auflisten';
  const done = await listAll(newC);
  step = 'Dateien kopieren';
  let copied = 0;
  let bytes = 0;
  let failed = 0;
  for (const [key, src] of sources) {
    if (done.get(key) === src.size) continue; // bereits kopiert (Wiederholung nach Abbruch)
    try {
      const body = await src.load();
      await newC.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
      copied++;
      bytes += body.length;
    } catch {
      failed++;
    }
    if (copied && copied % 50 === 0) console.log(`  … ${copied} Dateien kopiert`);
  }
  step = 'Ergebnis prüfen';
  const after = await listAll(newC);
  const { all, demoPages } = await neededKeys();
  const missingNeeded = [...all].filter((k) => !after.has(k)).length;
  const missingPages = [...demoPages].filter((k) => !after.has(k)).length;
  console.log(
    JSON.stringify({
      quellen: { lokaleSicherungen: dirs, alterSpeicher: oldReachable },
      kopiert: copied,
      mb: Math.round(bytes / 1e6),
      fehlgeschlagen: failed,
      benoetigt: all.size,
      fehlendBenoetigt: missingNeeded,
      fehlendeDemoSeiten: missingPages,
    }),
  );
  if (missingPages > 0)
    console.log(
      `  Hinweis: ${missingPages} Demo-Seite(n) fehlen in den Sicherungen. Diese Demos zeigen nach dem Umzug die Notfall-Kopie bzw. werden neu gebaut.`,
    );
  process.exit(failed === 0 ? 0 : 1);
} catch (err) {
  // Nur Name, HTTP-Status und Fehlertext ohne Schlüssel (Schlüssel stehen nie in diesen Texten)
  const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const msg = (e.message ?? '').replace(/[A-Za-z0-9/+=]{32,}/g, '…').slice(0, 200);
  console.error(
    `Storage-Kopie fehlgeschlagen bei „${step}“: ${e.name ?? 'Fehler'}${e.$metadata?.httpStatusCode ? ` (HTTP ${e.$metadata.httpStatusCode})` : ''}${msg ? ` – ${msg}` : ''}`,
  );
  process.exit(1);
}
