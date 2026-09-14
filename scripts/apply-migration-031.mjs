#!/usr/bin/env node
/**
 * Apply supabase/migrations/031_moloni_integration.sql to the remote database.
 *
 * Usage (pick one):
 *   DATABASE_URL='postgresql://postgres.[ref]:[password]@...' node scripts/apply-migration-031.mjs
 *   SUPABASE_DB_PASSWORD='...' node scripts/apply-migration-031.mjs
 *   SUPABASE_ACCESS_TOKEN='...' npx supabase db push --project-ref kkefsiihuozospzavzmg
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "kkefsiihuozospzavzmg";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "031_moloni_integration.sql");
const sql = readFileSync(migrationPath, "utf8");

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) return null;
  const host = process.env.SUPABASE_DB_HOST?.trim() || `db.${PROJECT_REF}.supabase.co`;
  const user = process.env.SUPABASE_DB_USER?.trim() || "postgres";
  const port = process.env.SUPABASE_DB_PORT?.trim() || "5432";
  const database = process.env.SUPABASE_DB_NAME?.trim() || "postgres";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function applyWithPg(url) {
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✓ Migração 031 aplicada com sucesso (moloni_settings + colunas payments).");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

function applyWithPsql(url) {
  const result = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-f", migrationPath], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error("psql falhou ao aplicar a migração");
  }
  console.log("✓ Migração 031 aplicada com sucesso via psql.");
}

async function main() {
  const url = buildDatabaseUrl();
  if (!url) {
    console.error(
      [
        "Credenciais em falta.",
        "",
        "Defina DATABASE_URL ou SUPABASE_DB_PASSWORD (password da base em",
        "Supabase → Project Settings → Database → Database password).",
        "",
        "Exemplo:",
        `  SUPABASE_DB_PASSWORD='...' node scripts/apply-migration-031.mjs`,
        "",
        "Alternativa: cole o SQL em supabase/migrations/031_moloni_integration.sql",
        "no Supabase Dashboard → SQL Editor → Run.",
      ].join("\n")
    );
    process.exit(1);
  }

  try {
    await applyWithPg(url);
  } catch (pgError) {
    const message = pgError instanceof Error ? pgError.message : String(pgError);
    if (/Cannot find module 'pg'/.test(message)) {
      console.warn("Pacote pg não instalado; a tentar psql…");
      applyWithPsql(url);
      return;
    }
    throw pgError;
  }
}

main().catch((error) => {
  console.error("Erro ao aplicar migração:", error instanceof Error ? error.message : error);
  process.exit(1);
});
