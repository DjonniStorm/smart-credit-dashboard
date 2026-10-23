import { readFile, readdir } from "node:fs/promises";

import { DataSource } from "typeorm";

const MIGRATIONS_LOCK_KEY = 7_301_001;
const migrationsDir = new URL("./migrations/", import.meta.url);

/** Применяет пронумерованные `.sql` по порядку, каждый файл один раз и в своей транзакции. */
export async function runMigrations(db: DataSource): Promise<string[]> {
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const applied: string[] = [];
  const runner = db.createQueryRunner();
  await runner.connect();
  try {
    await runner.query("select pg_advisory_lock($1)", [MIGRATIONS_LOCK_KEY]);
    await runner.query(
      "create table if not exists schema_migrations(name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set<string>(
      (await runner.query("select name from schema_migrations")).map(
        (row: { name: string }) => row.name,
      ),
    );
    for (const name of files) {
      if (done.has(name)) {
        continue;
      }
      const sql = await readFile(new URL(name, migrationsDir), "utf8");
      await runner.startTransaction();
      try {
        await runner.query(sql);
        await runner.query("insert into schema_migrations(name) values($1)", [
          name,
        ]);
        await runner.commitTransaction();
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
      applied.push(name);
    }
  } finally {
    await runner
      .query("select pg_advisory_unlock($1)", [MIGRATIONS_LOCK_KEY])
      .catch(() => undefined);
    await runner.release();
  }
  return applied;
}
