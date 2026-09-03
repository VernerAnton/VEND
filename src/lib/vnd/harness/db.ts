/**
 * A fresh, isolated world database per run.
 *
 * The sweep needs N independent shops, and PGLite is in-memory, so every run
 * gets its own instance and nothing leaks between seeds. That is also why the
 * harness needs no `run_id` columns on the `vnd_*` tables.
 *
 * This deliberately does NOT reuse `src/lib/db.ts`: that module memoizes one
 * process-wide instance (wrong for a sweep) and applies migrations through
 * Vite's `import.meta.glob`, which does not exist under plain Node. Schema
 * still comes from `migrations/*.sql` — the same single source — just read from
 * disk instead.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sql } from "../../db.ts";

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/**
 * Wrap a query runner in the tagged-template + `.query()` surface the engine
 * expects. Mirrors the private `toSql` in src/lib/db.ts:73 — duplicated (15
 * lines) rather than exported so the harness never reaches into the shared db
 * module that auth and app-data also depend on.
 */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "migrations",
);

let cachedSchema: string[] | null = null;

/**
 * `migrations/*.sql` in filename order. Non-recursive, so the opt-in auth
 * schema under `migrations/auth/` stays out — Vend does not use sign-in.
 * Cached because a 30-seed sweep would otherwise re-read the same files 30x.
 */
async function schemaFiles(): Promise<string[]> {
  if (cachedSchema) return cachedSchema;
  const names = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort();
  cachedSchema = await Promise.all(names.map((n) => readFile(join(migrationsDir, n), "utf8")));
  return cachedSchema;
}

export type HarnessDb = { sql: Sql; close: () => Promise<void> };

/** Spin up one empty, migrated world. Caller must `close()` it. */
export async function freshWorld(): Promise<HarnessDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite({
    parsers: { [OID_INT8]: Number, [OID_DATE]: identity, [OID_INTERVAL]: identity },
  });
  await pg.waitReady;
  for (const ddl of await schemaFiles()) await pg.exec(ddl);
  const sql = toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
  return { sql, close: () => pg.close() };
}
