import type { StorageProvider } from '../types';

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * S3-kompatibler Speicher (z. B. Hetzner Object Storage, Cloudflare R2, AWS S3).
 * Das AWS-SDK wird erst bei Nutzung geladen.
 */
export class S3Storage implements StorageProvider {
  readonly name = 's3';
  private clientPromise?: Promise<{ client: import('@aws-sdk/client-s3').S3Client; mod: typeof import('@aws-sdk/client-s3') }>;

  constructor(private readonly cfg: S3Config) {}

  private async c() {
    if (!this.clientPromise) {
      this.clientPromise = import('@aws-sdk/client-s3').then((mod) => ({
        mod,
        client: new mod.S3Client({
          region: this.cfg.region,
          endpoint: this.cfg.endpoint,
          forcePathStyle: Boolean(this.cfg.endpoint),
          credentials: { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey },
        }),
      }));
    }
    return this.clientPromise;
  }

  async put(key: string, data: Buffer | string, contentType?: string): Promise<void> {
    const { client, mod } = await this.c();
    await client.send(new mod.PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: data, ContentType: contentType }));
  }

  async get(key: string): Promise<Buffer | null> {
    const { client, mod } = await this.c();
    try {
      const res = await client.send(new mod.GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const { client, mod } = await this.c();
    try {
      await client.send(new mod.HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    const { client, mod } = await this.c();
    await client.send(new mod.DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<number> {
    const keys = await this.list(prefix);
    if (keys.length === 0) return 0;
    const { client, mod } = await this.c();
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new mod.DeleteObjectsCommand({
          Bucket: this.cfg.bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
        }),
      );
    }
    return keys.length;
  }

  async list(prefix: string): Promise<string[]> {
    const { client, mod } = await this.c();
    const out: string[] = [];
    let token: string | undefined;
    do {
      const res = await client.send(
        new mod.ListObjectsV2Command({ Bucket: this.cfg.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const o of res.Contents ?? []) if (o.Key) out.push(o.Key);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out.sort();
  }
}
