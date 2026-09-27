import { describe, expect, it } from "vitest";
import { loginToEmail, TEACHER_LOGIN } from "../lib/supabaseConfig";
import { CLASS_CODES, findStudent, normalizeLogin, roster } from "./roster";

describe("SHARPIE roster", () => {
  it("contains the four Year 9 classes with unique, login-safe names", () => {
    expect(roster.length).toBe(102);
    expect(new Set(roster.map((student) => student.login)).size).toBe(roster.length);
    for (const code of CLASS_CODES) {
      expect(roster.some((student) => student.classCode === code)).toBe(true);
    }
    expect(roster.every((student) => /^[a-z]+$/.test(student.login))).toBe(true);
    expect(roster.every((student) => student.name.trim().length > 0)).toBe(true);
  });

  it("normalizes typed names and accented characters into logins", () => {
    expect(normalizeLogin("João Pedro Dedivitis")).toBe("joaopedrodedivitis");
    expect(normalizeLogin("  JOÃO   PEDRO DEDIVITIS ")).toBe("joaopedrodedivitis");
    expect(normalizeLogin("julia o'reilly de araujo castro")).toBe("juliaoreillydearaujocastro");
    expect(findStudent("joaodedivitis")?.name).toBe("João Pedro Dedivitis");
    expect(findStudent("João Dedivitis")?.classCode).toBe("9A");
    expect(findStudent("João Pedro Dedivitis")?.classCode).toBe("9A");
    expect(findStudent("Julia O'Reilly de Araujo Castro")?.login).toBe("juliacastro");
    expect(findStudent("naoexiste")).toBeUndefined();
    expect(findStudent(TEACHER_LOGIN)).toBeUndefined();
  });

  it("maps logins to synthetic emails and keeps the teacher account separate", () => {
    expect(loginToEmail("joaopedrodedivitis")).toBe("joaopedrodedivitis@alunos.sharpie.app");
    expect(loginToEmail(TEACHER_LOGIN)).toBe("leleomaker@prof.sharpie.app");
  });
});
