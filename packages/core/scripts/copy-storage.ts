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
const oldC = client(need('S3_ENDPOINT'), need('S3_REGION'), need('S3_ACCESS_KEY_ID'), need('S3_SECRET_ACCESS_KEY'));
const newC = client(need('NEW_S3_ENDPOINT'), need('NEW_S3_REGION'), need('NEW_S3_ACCESS_KEY_ID'), need('NEW_S3_SECRET_ACCESS_KEY'));

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

try {
  try {
    await newC.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await newC.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  const src = [...(await listAll(oldC))].filter(([k]) => !k.startsWith('backups/'));
  const done = await listAll(newC);
  let copied = 0;
  let bytes = 0;
  for (const [key, size] of src) {
    if (done.get(key) === size) continue; // bereits kopiert (Wiederholung nach Abbruch)
    const res = await oldC.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = Buffer.from((await res.Body?.transformToByteArray()) ?? new Uint8Array());
    await newC.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: res.ContentType ?? undefined }),
    );
    copied++;
    bytes += body.length;
    if (copied % 50 === 0) console.log(`… ${copied} Dateien kopiert`);
  }
  const after = await listAll(newC);
  const missing = src.filter(([k, s]) => after.get(k) !== s).length;
  console.log(JSON.stringify({ quelle: src.length, kopiert: copied, mb: Math.round(bytes / 1e6), fehlend: missing }));
  process.exit(missing === 0 ? 0 : 1);
} catch (err) {
  console.error(`Storage-Kopie fehlgeschlagen: ${(err as { name?: string }).name ?? 'Fehler'}`);
  process.exit(1);
}
