/**
 * Supabase-Umzug (11.11.2026): kopiert alle Objekte des bisherigen S3-Buckets (Zugang aus S3_* im Worker) in den Bucket
 * des neuen Projekts (NEW_S3_*). Sicherungen unter backups/ werden nicht kopiert. Nur lesen beim alten, schreiben beim
 * neuen Projekt; nichts wird gelöscht. Gibt nur Zählwerte aus, keine Schlüssel oder Objektnamen.
 */
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
  new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId: id, secretAccessKey: secret } });

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

let step = 'Start';
try {
  step = 'Bucket im neuen Projekt prüfen/anlegen';
  try {
    await newC.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await newC.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  step = 'Dateien im alten Projekt auflisten';
  const src = [...(await listAll(oldC))].filter(([k]) => !k.startsWith('backups/'));
  step = 'Dateien im neuen Projekt auflisten';
  const done = await listAll(newC);
  step = 'Dateien kopieren';
  let copied = 0;
  let bytes = 0;
  for (const [key, size] of src) {
    if (done.get(key) === size) continue; // bereits kopiert (Wiederholung nach Abbruch)
    const res = await oldC.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = Buffer.from((await res.Body?.transformToByteArray()) ?? new Uint8Array());
    await newC.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: res.ContentType ?? undefined }));
    copied++;
    bytes += body.length;
    if (copied % 50 === 0) console.log(`… ${copied} Dateien kopiert`);
  }
  const after = await listAll(newC);
  const missing = src.filter(([k, s]) => after.get(k) !== s).length;
  console.log(JSON.stringify({ quelle: src.length, kopiert: copied, mb: Math.round(bytes / 1e6), fehlend: missing }));
  process.exit(missing === 0 ? 0 : 1);
} catch (err) {
  // Nur Name, HTTP-Status und Fehlertext ohne Schlüssel (Schlüssel stehen nie in diesen Texten)
  const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const msg = (e.message ?? '').replace(/[A-Za-z0-9/+=]{32,}/g, '…').slice(0, 200);
  console.error(
    `Storage-Kopie fehlgeschlagen bei „${step}“: ${e.name ?? 'Fehler'}${e.$metadata?.httpStatusCode ? ` (HTTP ${e.$metadata.httpStatusCode})` : ''}${msg ? ` – ${msg}` : ''}`,
  );
  process.exit(1);
}
