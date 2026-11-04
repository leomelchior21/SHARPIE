import type { Input } from "../content";

// A program line: "decl" is the variable line (it shows the train's value), anything else is C#.
// Every yard program has the same five slots: variable, if test, IF action, else, ELSE action.
export type Line = string;
export const ifLine = (condition: string): Line => `if (${condition})`;
export const printLine = (message: string): Line => `Console.WriteLine(${JSON.stringify(message)});`;

// How the student works on a level's program.
// blocks: tap code blocks into the slots. dial: set the operator and the number on the sensor.
// ifs: pick the whole if line from a short list. write: type the if / else yourself.
export type Tool = "blocks" | "dial" | "ifs" | "write";

export interface Why { question: string; options: string[]; answer: number; explain: string }

export interface YardLevel {
  id: string;
  stage: 0 | 1 | 2 | 3;
  title: string;
  place: string;
  /** The yard boss's radio message: the rule in plain words. */
  dispatch: string;
  variable: string;
  min: number;
  max: number;
  /** The rule the yard must follow. */
  condition: string;
  yes: string;
  no: string;
  tool: Tool;
  preset: Line[];
  /** Slots that are printed on the program and cannot change. */
  given: number[];
  bank?: Line[];
  /** Slot names on the empty slots, and the bank in program order. */
  labels?: boolean;
  ordered?: boolean;
  ops?: string[];
  /** The sensor's number can move; without it only the operator changes. */
  dialRange?: [number, number];
  /** A SWAP STATIONS lever exchanges the two messages. */
  swap?: boolean;
  /** The yard has to run once, as it is, before anything can change. */
  runFirst?: boolean;
  /** What went wrong, told as an incident report. */
  incident?: string;
  /** Three trains per level: just below, at and just above the edge. */
  timetable: Input[];
  /** The train the student predicts before the first run. */
  spotlight: Input;
  why: Why;
  note: string;
}

export const stages = [
  { name: "LAY THE TRACK", short: "A" },
  { name: "SET THE SENSOR", short: "B" },
  { name: "INCIDENTS", short: "C" },
  { name: "HEAD CONTROLLER", short: "D" },
];

const five = (condition: string, yes: string, no: string): Line[] => ["decl", ifLine(condition), printLine(yes), "else", printLine(no)];

export const levels: YardLevel[] = [
  {
    id: "cinema", stage: 0, title: "First Switch", place: "Lumen Cinema line",
    dispatch: "Kids aged 12 and under ride to the DISCOUNT platform. Everyone else pays the regular ticket.",
    variable: "age", min: 0, max: 20, condition: "age <= 12", yes: "Child discount", no: "Regular ticket",
    tool: "blocks", preset: ["", "", "", "", ""], given: [], labels: true, ordered: true,
    bank: five("age <= 12", "Child discount", "Regular ticket"),
    timetable: [11, 12, 13], spotlight: 12,
    why: { question: "Why did train 12 go to Child discount?", options: ["12 <= 12 is true: <= includes 12.", "12 is smaller than 12.", "Every train takes the top track first."], answer: 0, explain: "<= means less than OR equal. 12 is equal, so the test is true." },
    note: "Every if / else has five parts. The test sends each train to exactly one track.",
  },
  {
    id: "delivery", stage: 0, title: "No Labels", place: "Bolt Bites depot",
    dispatch: "Orders of 100 or more ship for free. Smaller orders pay the delivery fee.",
    variable: "total", min: 0, max: 150, condition: "total >= 100", yes: "Free delivery", no: "Delivery fee",
    tool: "blocks", preset: ["", "", "", "", ""], given: [],
    bank: five("total >= 100", "Free delivery", "Delivery fee"),
    timetable: [99, 100, 101], spotlight: 100,
    why: { question: "Train 99 paid the delivery fee. Why?", options: ["99 >= 100 is false, so the else track runs.", "99 is too close to 100.", "The else track always runs last."], answer: 0, explain: "The test is false, so C# skips the IF block and runs the else block." },
    note: "C# reads the program from top to bottom. The test must come before the actions it controls.",
  },
  {
    id: "fan", stage: 0, title: "Dead End", place: "Breeze factory",
    dispatch: "Switch the fan on only above 30 degrees. At 30 or below it stays off. Somebody forgot half the yard.",
    variable: "temperature", min: 0, max: 45, condition: "temperature > 30", yes: "Fan on", no: "Fan off",
    tool: "blocks", preset: ["decl", ifLine("temperature > 30"), printLine("Fan on"), "", ""], given: [0, 1, 2], runFirst: true,
    bank: ["else", printLine("Fan off"), ifLine("temperature < 30"), printLine("Too hot")],
    timetable: [29, 30, 31], spotlight: 30,
    why: { question: "Before you added else, what happened to train 29?", options: ["Nothing printed: a false test skips the IF block.", "It printed Fan on anyway.", "C# stopped with an error."], answer: 0, explain: "Without else there is no FALSE track. A false test just skips the block and nothing happens." },
    note: "else has no test of its own: it catches every train the if lets go.",
  },
  {
    id: "battery", stage: 1, title: "Calibrate", place: "Pulse Phones plant",
    dispatch: "Below 20 percent the phone warns Low battery. At exactly 20 the battery is still OK.",
    variable: "battery", min: 0, max: 100, condition: "battery < 20", yes: "Low battery", no: "Battery OK",
    tool: "dial", preset: five("battery > 50", "Low battery", "Battery OK"), given: [0, 2, 3, 4],
    ops: [">", "<", ">=", "<=", "==", "!="], dialRange: [0, 100],
    timetable: [19, 20, 21], spotlight: 20,
    why: { question: "Why does battery 20 count as OK?", options: ["20 < 20 is false: < does not include 20.", "20 is a round number.", "The sensor rounds up."], answer: 0, explain: "< is strictly less than. 20 is not less than itself, so it goes to the else track." },
    note: "The edge belongs to one side only. < leaves it out; <= would take it in.",
  },
  {
    id: "vault", stage: 1, title: "Exact Match", place: "Vault 42",
    dispatch: "Only the exact code 42 opens the vault door. Every other number is denied.",
    variable: "code", min: 0, max: 60, condition: "code == 42", yes: "Door opens", no: "Access denied",
    tool: "dial", preset: five("code >= 40", "Door opens", "Access denied"), given: [0, 2, 3, 4],
    ops: ["=", "==", "!=", ">=", "<="], dialRange: [0, 60],
    timetable: [41, 42, 43], spotlight: 42,
    why: { question: "Why does only one train ever reach Door opens?", options: ["== is true for exactly one value.", "The vault only has one train.", "42 is the biggest number."], answer: 0, explain: "== asks: are these exactly the same? Only 42 is the same as 42." },
    note: "= stores a value. == compares two values. The switch only understands comparisons.",
  },
  {
    id: "arcade", stage: 1, title: "Two Ways Round", place: "Pixel Quest arcade",
    dispatch: "When health is 0 it is Game over. With any health left, keep playing.",
    variable: "health", min: 0, max: 100, condition: "health == 0", yes: "Game over", no: "Keep playing",
    tool: "dial", preset: five("health != 0", "Game over", "Keep playing"), given: [0, 3], swap: true,
    ops: ["==", "!="],
    timetable: [0, 1, 50], spotlight: 0,
    why: { question: "health == 0 and health != 0 can both work. What has to change with them?", options: ["Which message sits on the TRUE track.", "Nothing: they mean the same thing.", "The variable has to be renamed."], answer: 0, explain: "!= is the opposite of ==. Flip the test and the messages must swap tracks too." },
    note: "The same decision can be written two ways: flip the test, swap the stations.",
  },
  {
    id: "rain", stage: 1, title: "Yes / No Cargo", place: "Harbor weather post",
    dispatch: "If it is raining, hand out umbrellas. If not, hand out sunglasses.",
    variable: "isRaining", min: 0, max: 1, condition: "isRaining", yes: "Take an umbrella", no: "Wear sunglasses",
    tool: "ifs", preset: ["decl", "", printLine("Take an umbrella"), "else", printLine("Wear sunglasses")], given: [0, 3], swap: true,
    bank: [ifLine("isRaining"), ifLine("isRaining == true"), ifLine("isRaining == false"), ifLine("isRaining = true")],
    timetable: [true, false, true], spotlight: false,
    why: { question: "Why does if (isRaining) work without == true?", options: ["isRaining is already true or false.", "C# adds == true when you forget it.", "It only works for rain."], answer: 0, explain: "A bool is already a condition. if (isRaining) and if (isRaining == true) ask the same thing." },
    note: "A bool can be the whole test. Its value is already true or false.",
  },
  {
    id: "ride", stage: 2, title: "Wrong Platform", place: "Loop-the-Loop park",
    dispatch: "Riders 140 cm or taller may ride. Shorter riders wait. The yard is already running.",
    incident: "A kid exactly 140 cm tall was sent to Too short. The family is not happy.",
    variable: "height", min: 100, max: 180, condition: "height >= 140", yes: "Ride open", no: "Too short",
    tool: "dial", preset: five("height > 140", "Ride open", "Too short"), given: [0, 2, 3, 4], runFirst: true,
    ops: [">", ">=", "<", "<="], dialRange: [100, 180],
    timetable: [140, 139, 141], spotlight: 141,
    why: { question: "Why was the kid at 140 sent away?", options: ["140 > 140 is false: > does not include 140.", "The sensor broke.", "140 is less than 140."], answer: 0, explain: "> leaves the edge out. The rule said 140 or taller, so it needs >=." },
    note: "Most bugs in a test live at the edge. Always run the exact number from the rule.",
  },
  {
    id: "library", stage: 2, title: "Swapped Signs", place: "City library",
    dispatch: "A book returned 1 day late or more pays a fine. On time gets a thank you.",
    incident: "A book 5 days late got a Thank you! sign. Fix the yard, then rerun everything.",
    variable: "daysLate", min: 0, max: 30, condition: "daysLate > 0", yes: "Pay a fine", no: "Thank you!",
    tool: "dial", preset: five("daysLate > 1", "Thank you!", "Pay a fine"), given: [0, 3], runFirst: true, swap: true,
    ops: [">", ">=", "==", "!="], dialRange: [0, 30],
    timetable: [5, 1, 0], spotlight: 1,
    why: { question: "Why didn't fixing the signs fix everything?", options: ["There were two bugs: the signs and the edge.", "The tests were wrong.", "Signs can't be swapped in C#."], answer: 0, explain: "One fix can uncover the next bug. That is why every test runs again after a change." },
    note: "A bug can hide in the action, not only in the test. Rerun every train after each fix.",
  },
  {
    id: "pool", stage: 3, title: "Write It Yourself", place: "Sunset pool",
    dispatch: "Water at 26 degrees or more: Pool open. Otherwise: Too cold. Write the whole switch yourself.",
    variable: "water", min: 0, max: 40, condition: "water >= 26", yes: "Pool open", no: "Too cold",
    tool: "write", preset: [], given: [0],
    timetable: [25, 26, 27], spotlight: 26,
    why: { question: "Which three trains prove a rule with >= 26?", options: ["25, 26 and 27: below, at and above the edge.", "0, 20 and 40: spread out.", "26, 26 and 26: the edge three times."], answer: 0, explain: "The edge decides everything. Test just below it, exactly on it and just above it." },
    note: "You wrote a real C# decision from nothing, and chose the tests that prove it.",
  },
];

export const levelCount = levels.length;