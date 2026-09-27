/**
 * SHARPIE account seeding.
 *
 * Creates one Supabase Auth user per student and the teacher account, all with
 * the synthetic email and password = the login itself. Students and the teacher
 * never type a password: the app signs in with the login as password.
 * Run it from this repository:
 *
 *   set SUPABASE_SERVICE_ROLE_KEY=...        (Windows PowerShell: $env:...)
 *   node scripts/seed-sharpie.mjs
 *
 * Optional:
 *   SHARPIE_RESET_PASSWORDS=true             (reset passwords of existing users)
 *   SUPABASE_URL=https://...                 (defaults to the SHARPIE project)
 *
 * The service role key is read from the environment only and is never stored
 * in the repository or shipped to the browser.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://imodobxbarcsjylvitxt.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESET_PASSWORDS = process.env.SHARPIE_RESET_PASSWORDS === "true";

const STUDENT_DOMAIN = "alunos.sharpie.app";
const TEACHER_LOGIN = "leleomaker";
const TEACHER_DOMAIN = "prof.sharpie.app";

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Get it in Supabase -> Project Settings -> API.");
  process.exit(1);
}

const roster = JSON.parse(readFileSync(new URL("../src/data/roster.json", import.meta.url), "utf8")).students;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userCache = null;
async function findUserByEmail(email) {
  if (!userCache) {
    userCache = new Map();
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const user of data.users) {
        if (user.email) userCache.set(user.email.toLowerCase(), user);
      }
      if (data.users.length < 1000) break;
    }
  }
  return userCache.get(email.toLowerCase());
}

async function createAccount(email, password, metadata) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!error) return "created";
  const alreadyExists = error.code === "email_exists" || /already|registered|exists/i.test(error.message ?? "");
  if (!alreadyExists) throw new Error(`${email}: ${error.message}`);
  if (RESET_PASSWORDS) {
    const user = await findUserByEmail(email);
    if (user) {
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });
      if (updateError) throw new Error(`${email}: ${updateError.message}`);
      return "password-reset";
    }
  }
  return "exists";
}

console.log(`SHARPIE seeding ${roster.length} students into ${SUPABASE_URL}`);
let created = 0;
let existing = 0;
for (const [index, student] of roster.entries()) {
  const email = `${student.login}@${STUDENT_DOMAIN}`;
  const password = student.login;
  const status = await createAccount(email, password, {
    login: student.login,
    display_name: student.name,
    class_code: student.classCode,
    group_name: student.group,
  });
  if (status === "created") created += 1;
  else existing += 1;
  if ((index + 1) % 10 === 0) console.log(`  ${index + 1}/${roster.length}...`);
}

const teacherStatus = await createAccount(`${TEACHER_LOGIN}@${TEACHER_DOMAIN}`, TEACHER_LOGIN, {
  login: TEACHER_LOGIN,
  display_name: "Professor",
  role: "teacher",
});
console.log(`teacher leleomaker: ${teacherStatus}`);

const { error: rosterError } = await admin
  .from("sharpie_students")
  .upsert(
    roster.map((student) => ({
      login: student.login,
      display_name: student.name,
      class_code: student.classCode,
      group_name: student.group,
    })),
    { onConflict: "login" },
  );
if (rosterError) {
  console.error(`Roster upsert failed: ${rosterError.message}`);
  console.error("Run supabase/sharpie-setup.sql first.");
  process.exit(1);
}

console.log(`Done. created: ${created}, already existed: ${existing}, roster rows: ${roster.length}`);
