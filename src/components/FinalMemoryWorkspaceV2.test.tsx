import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { FinalMemoryWorkspaceV2 } from "./FinalMemoryWorkspaceV2";

vi.mock("@uiw/react-codemirror", () => ({
  default: ({ value, onChange, ...props }: { value: string; onChange: (value: string) => void; [key: string]: unknown }) => (
    <textarea aria-label={String(props["aria-label"])} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
  ),
}));

const data = {
  name: "Leo",
  age: "14",
  countriesVisited: "3",
  favoriteFood: "Sushi",
  likes: "Movies",
};

function Harness() {
  const [screenNumber, setScreenNumber] = useState(0);
  const [typeReveal, setTypeReveal] = useState(0);
  const [consoleStep, setConsoleStep] = useState(0);
  return (
    <FinalMemoryWorkspaceV2
      data={data}
      screen={screenNumber}
      typeReveal={typeReveal}
      consoleStep={consoleStep}
      onTypeReveal={setTypeReveal}
      onConsoleStep={setConsoleStep}
      onOpenConsole={() => setScreenNumber(1)}
      onComplete={() => undefined}
    />
  );
}

describe("Memory Machine C# bridge", () => {
  afterEach(cleanup);

  it("reveals types, guides two lines, then asks the student for three", () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /add string/i }));
    expect(container.querySelectorAll(".prefix-string")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /add int/i }));
    expect(container.querySelectorAll(".prefix-int")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /continue to console/i }));

    fireEvent.click(screen.getByRole("button", { name: /add writeline for name/i }));
    expect(screen.getByText("Console.WriteLine(", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /run first line/i }));
    fireEvent.click(screen.getByRole("button", { name: /add writeline for age/i }));
    fireEvent.click(screen.getByRole("button", { name: /run second line/i }));

    const editor = screen.getByRole("textbox", { name: /complete the console/i });
    fireEvent.change(editor, {
      target: {
        value: `${(editor as HTMLTextAreaElement).value}\nConsole.WriteLine(countriesVisited);\nConsole.WriteLine(favoriteFood);\nConsole.WriteLine(likes);`,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /check my code/i }));
    expect(screen.getByRole("button", { name: /complete memory machine/i })).toBeInTheDocument();
    expect(screen.getByText("All five values retrieved.")).toBeInTheDocument();
  });
});
