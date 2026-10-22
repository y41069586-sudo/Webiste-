import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StorageProvider } from '../types';

/** Dateisystem-Speicher (Entwicklung und kleiner VPS mit Volume). */
export class LocalStorage implements StorageProvider {
  readonly name = 'local';
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  private resolve(key: string): string {
    if (!/^[A-Za-z0-9._\-/]+$/.test(key) || key.includes('..') || key.startsWith('/')) {
      throw new Error(`Ungültiger Speicherschlüssel: ${key}`);
    }
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error('Pfad außerhalb des Speichers');
    return p;
  }

  async put(key: string, data: Buffer | string): Promise<void> {
    const p = this.resolve(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, p);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<number> {
    const keys = await this.list(prefix);
    await Promise.all(keys.map((k) => this.delete(k)));
    // leere Ordner aufräumen
    const dir = this.resolve(prefix.replace(/\/$/, ''));
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return keys.length;
  }

  async list(prefix: string): Promise<string[]> {
    const base = this.resolve(prefix.replace(/\/$/, '') || '.');
    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (!e.name.endsWith('.tmp')) out.push(path.relative(this.root, full).split(path.sep).join('/'));
      }
    };
    await walk(base);
    return out.sort();
  }
}
