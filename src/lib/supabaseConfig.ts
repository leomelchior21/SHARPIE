const FALLBACK_URL = "https://imodobxbarcsjylvitxt.supabase.co";
const FALLBACK_KEY = "sb_publishable_jkHrLZkNR4Zh3XtHEgpTMA_JnMMpG6w";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_URL;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? FALLBACK_KEY;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const STUDENT_EMAIL_DOMAIN = "alunos.sharpie.app";
export const TEACHER_EMAIL_DOMAIN = "prof.sharpie.app";
export const TEACHER_LOGIN = "leleomaker";

export function loginToEmail(login: string) {
  return `${login}@${login === TEACHER_LOGIN ? TEACHER_EMAIL_DOMAIN : STUDENT_EMAIL_DOMAIN}`;
}
