/**
 * Creates the SHARPIE accounts through the public Auth API.
 *
 * Works when the project has email confirmation disabled (SHARPIE's case).
 * Every account (students and teacher) uses password = login.
 *
 *   node scripts/seed-accounts.mjs
 */
import { readFileSync } from "node:fs";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://imodobxbarcsjylvitxt.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_jkHrLZkNR4Zh3XtHEgpTMA_JnMMpG6w";
const STUDENT_DOMAIN = "alunos.sharpie.app";
const TEACHER_LOGIN = "leleomaker";
const TEACHER_DOMAIN = "prof.sharpie.app";

const roster = JSON.parse(readFileSync(new URL("../src/data/roster.json", import.meta.url), "utf8")).students;

const headers = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };

async function auth(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureAccount(email, password) {
  const { status, json } = await auth("signup", { email, password });
  if (json.access_token) return "created";
  if (status === 429) return "rate-limited";
  // Existing accounts come back without a session; verify with a sign-in.
  const signIn = await auth("token?grant_type=password", { email, password });
  if (signIn.json.access_token) return "exists";
  if (signIn.status === 429) return "rate-limited";
  return `failed: ${signIn.json.error_description ?? signIn.json.msg ?? JSON.stringify(signIn.json)}`;
}

console.log(`Creating ${roster.length} student accounts + teacher on ${SUPABASE_URL}`);
let created = 0;
let existing = 0;
let pending = [];

for (const [index, student] of roster.entries()) {
  const email = `${student.login}@${STUDENT_DOMAIN}`;
  const status = await ensureAccount(email, student.login);
  if (status === "created") created += 1;
  else if (status === "exists") existing += 1;
  else pending.push(student);
  if ((index + 1) % 5 === 0 || index === roster.length - 1) {
    console.log(`  ${index + 1}/${roster.length} (criados: ${created}, existentes: ${existing}, pendentes: ${pending.length})`);
  }
  await sleep(150);
}

if (pending.length) {
  console.log(`Second pass for ${pending.length} pending accounts (waiting 20s)...`);
  await sleep(20_000);
  const stillPending = [];
  for (const student of pending) {
    const status = await ensureAccount(`${student.login}@${STUDENT_DOMAIN}`, student.login);
    if (status === "created") created += 1;
    else if (status === "exists") existing += 1;
    else stillPending.push(`${student.login}: ${status}`);
    await sleep(300);
  }
  pending = stillPending;
}

const teacherStatus = await ensureAccount(`${TEACHER_LOGIN}@${TEACHER_DOMAIN}`, TEACHER_LOGIN);
console.log(`teacher ${TEACHER_LOGIN}: ${teacherStatus}`);
if (pending.length) {
  console.log(`still pending (${pending.length}):`);
  for (const failure of pending) console.log(`  ${failure}`);
}
console.log(`Done. created: ${created}, existing: ${existing}, pending: ${pending.length}`);
