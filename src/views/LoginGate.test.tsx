import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginGate } from "./LoginGate";

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn() }));

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: auth.signInWithPassword } },
}));

describe("classroom login gate", () => {
  afterEach(cleanup);

  beforeEach(() => {
    auth.signInWithPassword.mockReset();
  });

  it("rejects a name that is not in the roster without calling Supabase", async () => {
    render(<LoginGate onAuthenticated={() => undefined} />);
    fireEvent.change(screen.getByPlaceholderText("joaosilva"), { target: { value: "fulanodetal" } });
    fireEvent.click(screen.getByRole("button", { name: /ENTER/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Name not found/));
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("lets a student in with only first name plus last name, no password field", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const onAuthenticated = vi.fn();
    render(<LoginGate onAuthenticated={onAuthenticated} />);

    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("joaosilva"), { target: { value: "João Dedivitis" } });
    fireEvent.click(screen.getByRole("button", { name: /ENTER/ }));

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith({
        login: "joaodedivitis",
        name: "João Pedro Dedivitis",
        isTeacher: false,
      }),
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "joaodedivitis@alunos.sharpie.app",
      password: "joaodedivitis",
    });
  });

  it("explains when the school account is missing or unavailable", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginGate onAuthenticated={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText("joaosilva"), { target: { value: "joaodedivitis" } });
    fireEvent.click(screen.getByRole("button", { name: /ENTER/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Ask your teacher/));
  });

  it("lets the teacher in with only the leleomaker login, no password field", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const onAuthenticated = vi.fn();
    render(<LoginGate onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByPlaceholderText("joaosilva"), { target: { value: "leleomaker" } });
    expect(document.querySelector('input[type="password"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /ENTER/ }));

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith({ login: "leleomaker", name: "Professor", isTeacher: true }),
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "leleomaker@prof.sharpie.app",
      password: "leleomaker",
    });
  });
});
