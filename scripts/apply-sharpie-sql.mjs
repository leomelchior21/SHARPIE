/**
 * Applies every supabase/sharpie-*.sql file (except the roster seed) through
 * the Supabase Management API.
 *
 * Needs a personal access token (https://supabase.com/dashboard/account/tokens):
 *
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/apply-sharpie-sql.mjs
 *
 * You can also put SUPABASE_ACCESS_TOKEN in a .env file at the repo root
 * (.env is gitignored).
 */
import { readFileSync } from "node:fs";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "imodobxbarcsjylvitxt";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).");
  process.exit(1);
}

const SQL_FILES = [
  "sharpie-setup.sql",
  "sharpie-live.sql",
  "sharpie-mathler-survival.sql",
];

for (const file of SQL_FILES) {
  const sql = readFileSync(new URL(`../supabase/${file}`, import.meta.url), "utf8");
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`${file} failed (${response.status}): ${text}`);
    process.exit(1);
  }

  console.log(`${file} applied to ${PROJECT_REF}.`);
}

console.log("SHARPIE SQL setup complete.");
