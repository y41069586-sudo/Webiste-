import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './client';

/**
 * Führt alle Drizzle-Migrationen aus. Der Ordner kann über MIGRATIONS_DIR
 * überschrieben werden (z. B. im gebündelten Worker-Image).
 */
export async function runMigrations(migrationsFolder?: string): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const folder = migrationsFolder ?? process.env.MIGRATIONS_DIR ?? path.resolve(here, '../../drizzle');
  await migrate(getDb(), { migrationsFolder: folder });
}
