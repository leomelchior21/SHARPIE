import rosterJson from "./roster.json";

export type ClassCode = "9A" | "9B" | "9C" | "9D";

export type RosterStudent = {
  login: string;
  name: string;
  classCode: ClassCode;
  group: string | null;
};

export const CLASS_CODES: ClassCode[] = ["9A", "9B", "9C", "9D"];

export const roster = rosterJson.students as RosterStudent[];

const byLogin = new Map<string, RosterStudent>();
for (const student of roster) byLogin.set(student.login, student);
for (const student of roster) {
  const fullName = normalizeLogin(student.name);
  if (!byLogin.has(fullName)) byLogin.set(fullName, student);
}

export function normalizeLogin(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function findStudent(login: string): RosterStudent | undefined {
  return byLogin.get(normalizeLogin(login));
}

export function studentsByClass(classCode: ClassCode): RosterStudent[] {
  return roster.filter((student) => student.classCode === classCode);
}
