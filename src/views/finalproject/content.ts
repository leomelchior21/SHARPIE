export type Operator = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type Input = number | boolean;
export type Scenario = {
  id: string; title: string; variable: string; initial: Input; min: number; max: number; step: number;
  condition: string; yes: string; no: string; description: string; note: string; symbol: string;
};
export const flows: Scenario[] = [
  { id: "school", title: "The school result", variable: "grade", initial: 5, min: 0, max: 10, step: 0.25, condition: "grade >= 7", yes: "Approved", no: "Try again", description: "Change a student's grade to see whether they pass. Explore both paths around grade 7.", note: "The boundary belongs to one path: 7 is included in >= 7.", symbol: "A+" },
  { id: "movie", title: "Movie night", variable: "age", initial: 12, min: 0, max: 20, step: 1, condition: "age <= 12", yes: "Child discount", no: "Regular ticket", description: "Choose an age. Does a 12-year-old get the child discount? Test both ticket outcomes.", note: "12 is included. Compare ages 11, 12 and 13.", symbol: "▥" },
  { id: "viral", title: "The viral post", variable: "views", initial: 900, min: 0, max: 2000, step: 100, condition: "views > 1000", yes: "BOOST", no: "NORMAL", description: "A fictional feed chooses visibility from a view count. Try 900, 1000 and 1100.", note: "This simplified fictional algorithm is for learning. Views do not prove accuracy; real platforms use many signals.", symbol: "↗" },
];
// A program line in the Code Builder: "decl" is the variable line (it shows the current input),
// anything else is the C# line itself. Every program has the same five lines:
// variable, if test, IF action, else, ELSE action. C# adds the braces.
export type Line = string;
export const ifLine = (condition: string): Line => `if (${condition})`;
export const printLine = (message: string): Line => `Console.WriteLine(${JSON.stringify(message)});`;
// Support fades ticket by ticket: labels, order, distractors, prediction, one line, debugging.
export type BuilderLevel = {
  skill: string;
  support: number;
  preset: Line[];
  given: number[];
  repair: number[];
  bank: Line[];
  ordered: boolean;
  labels: boolean;
  predict: boolean;
};
type LevelSpec = { skill: string; support: number; given?: number[]; repair?: number[]; broken?: Record<number, Line>; extras?: Line[]; bank?: Line[]; ordered?: boolean; labels?: boolean; predict?: boolean };
export type Challenge = Scenario & { phase: string; hints: string[]; level: BuilderLevel };
export const solution = (c: Pick<Scenario, "condition" | "yes" | "no">): Line[] => ["decl", ifLine(c.condition), printLine(c.yes), "else", printLine(c.no)];
const challenge = (id: string, title: string, variable: string, initial: Input, max: number, condition: string, yes: string, no: string, description: string, phase: string, spec: LevelSpec, note = "Test both paths, including the boundary."): Challenge => {
  const lines = solution({ condition, yes, no });
  const given = spec.given ?? [];
  const repair = spec.repair ?? [];
  const preset = lines.map((line, i) => spec.broken?.[i] ?? (given.includes(i) || repair.includes(i) ? line : ""));
  const open = lines.filter((_, i) => !given.includes(i));
  return {
    id, title, variable, initial, min: 0, max, step: variable === "views" ? 100 : 1, condition, yes, no, description, phase, note,
    level: { skill: spec.skill, support: spec.support, preset, given, repair, bank: spec.bank ?? [...new Set([...open, ...Object.values(spec.broken ?? {}), ...(spec.extras ?? [])])], ordered: spec.ordered ?? false, labels: spec.labels ?? false, predict: spec.predict ?? false },
    symbol: ({ movie: "▥", delivery: "↗", heat: "°C", battery: "▰", secret: "42", health: "♥", viral: "↗", sponsored: "AD", evidence: "?", hidden: "◉" } as Record<string,string>)[id],
    hints: [description, `Look at the ${id === "hidden" || id === "sponsored" ? "output on each path" : "comparison inside the parentheses"}.`, typeof initial === "boolean" ? "Try true and false. Which message should each input choose?" : `Test just below, exactly at, and just above ${condition.split(" ").pop()}. Which message does the mission ask for?`],
  };
};
const all = [0, 1, 2, 3, 4];
const except = (...slots: number[]) => all.filter((slot) => !slots.includes(slot));
export const challenges: Challenge[] = [
  challenge("movie", "Movie night", "age", 12, 20, "age <= 12", "You get a child discount!", "Regular ticket price applies", "Age 12 or under gets a child discount. Everyone else pays the regular ticket price.", "A · Understand the structure",
    { skill: "Observe the structure", support: 10, ordered: true, labels: true }),
  challenge("delivery", "Free delivery", "total", 100, 150, "total >= 100", "Free delivery", "Delivery fee", "Orders of 100 or more get free delivery. Smaller orders pay a delivery fee.", "A · Understand the structure",
    { skill: "Order the structure", support: 9 }),
  challenge("heat", "Too hot?", "temperature", 30, 45, "temperature > 30", "Turn on the fan", "Fan stays off", "Turn on the fan only above 30 degrees. At 30, leave it off.", "A · Understand the structure",
    { skill: "Pick the right pieces", support: 8, extras: [ifLine("temperature >= 30"), ifLine("temperature < 30")] }, "30 is equal to 30, not greater than 30."),
  challenge("battery", "Low battery", "battery", 20, 100, "battery < 20", "Low battery", "Battery OK", "Below 20 means low battery. At 20 or more, the battery is OK.", "B · Control the decision",
    { skill: "Predict, then build", support: 7, predict: true, extras: [ifLine("battery <= 20")] }),
  challenge("secret", "Secret door", "secret", 42, 60, "secret == 42", "Door unlocked", "Access denied", "Only the exact secret number 42 unlocks the door.", "B · Control the decision",
    { skill: "Choose the operator", support: 6, given: except(1), bank: ["<", "<=", "==", "!=", ">=", ">"].map((op) => ifLine(`secret ${op} 42`)) }, "== compares. A single = would store a value instead."),
  challenge("health", "Game over", "health", 0, 100, "health == 0", "Game over", "Keep playing", "Zero health ends the game. Any positive health keeps it going.", "B · Control the decision",
    { skill: "Complete the structure", support: 5, given: except(3), extras: ["health = 0;", ifLine("health > 0")] }, "else has no condition: it runs whenever the if test is false."),
  challenge("viral", "Going viral", "views", 1000, 2000, "views > 1000", "BOOST", "NORMAL", "Boost posts above 1000 views. Otherwise keep normal visibility.", "C · The digital world",
    { skill: "Debug the condition", support: 4, repair: [1], given: except(1), broken: { 1: ifLine("views >= 1000") }, extras: [ifLine("views <= 1000")] }, "Visibility is not credibility. This is a simplified fictional feed."),
  challenge("sponsored", "Sponsored content", "sponsored", true, 1, "sponsored", "Sponsored", "Organic", "The advertising labels are swapped. Repair both outputs so paid content is disclosed.", "C · The digital world",
    { skill: "Debug the outputs", support: 3, repair: [2, 4], given: except(2, 4), broken: { 2: printLine("Organic"), 4: printLine("Sponsored") } }, "A favorable post is not necessarily sponsored. Here the input explicitly tells us it is paid content."),
  challenge("evidence", "Needs verification", "hasEvidence", false, 1, "hasEvidence == false", "Needs review", "Evidence provided", "When evidence is absent, request review. When evidence exists, say it was provided.", "C · The digital world",
    { skill: "Build with less help", support: 2, given: [0, 3], extras: [ifLine("hasEvidence == true")] }, "Evidence can be evaluated. Its presence alone does not prove a claim is true."),
  challenge("hidden", "Hidden report", "mentionsInvestigation", true, 1, "mentionsInvestigation", "SHOW + REVIEW", "SHOW", "A rule hides an environmental investigation because of its topic. Replace HIDE with SHOW + REVIEW.", "C · The digital world",
    { skill: "Find the unfair line", support: 1, repair: [1, 2, 4], given: [0, 3], broken: { 2: printLine("HIDE") }, extras: [ifLine("mentionsInvestigation == false")] }, "The syntax works. The policy is the problem. Next, audit the fictional ECHO system."),
];
export function program(s: Pick<Scenario, "variable" | "initial" | "condition" | "yes" | "no"> & Partial<Pick<Scenario,"step">>, input: Input = s.initial, pieces = [s.condition, s.yes, s.no]) {
  const type=typeof input === "boolean" ? "bool" : (s.step??1)<1 || !Number.isInteger(input) ? "double" : "int";
  return `${type} ${s.variable} = ${input};\n\nif (${pieces[0]})\n{\n    Console.WriteLine(${JSON.stringify(pieces[1])});\n}\nelse\n{\n    Console.WriteLine(${JSON.stringify(pieces[2])});\n}`;
}
export type Question = { id: string; concept: string; prompt: string; code: string; options: string[]; answer: number; explanation: string };
const q = (n: number, concept: string, code: string, options: string[], answer: number, explanation: string, prompt = "What does this C# program print?"): Question => ({ id: `q${n}`, concept, code, options, answer, explanation, prompt });
const conditional = (variable: string, initial: Input, condition: string, yes: string, no?: string) => no === undefined ? `${typeof initial === "boolean" ? "bool" : "int"} ${variable} = ${initial};\n\nif (${condition})\n{\n    Console.WriteLine(${JSON.stringify(yes)});\n}` : program({ variable, initial, condition, yes, no });
export const questions: Question[] = [
  q(1,"Comparison",'int x = 10;\nConsole.WriteLine(x < 5);',["True","False","10","Error"],1,"10 is not less than 5, so C# prints False."),
  q(2,"Comparison",'int level = 5;\nConsole.WriteLine(level >= 7);',["False","True","5","Error"],0,"5 is below 7. The comparison is false."),
  q(3,"Boundary",'int age = 12;\nConsole.WriteLine(age <= 12);',["False","12","True","Error"],2,"<= includes equality. 12 is allowed."),
  q(4,"Equality",'int key = 42;\nConsole.WriteLine(key == 42);',["42","Error","False","True"],3,"== compares values. Both sides are 42."),
  q(5,"Equality",'int views = 800;\nConsole.WriteLine(views != 800);',["True","False","800","Error"],1,"!= asks whether values differ. These values are equal."),
  q(6,"Boolean",'bool ready = true;\nConsole.WriteLine(ready);',["ready","False","True","Error"],2,"The bool value true is printed as True, with a capital T."),
  q(7,"Equality",'// Choose the equality comparison operator.\nint left = 12;\nint right = 12;',["=","==","!=",">="],1,"== compares equality. A single = assigns a value.","Which C# operator compares whether two values are equal?"),
  q(8,"Comparison",'int energy = 65;\nConsole.WriteLine(energy > 60);',["True","False","65","Error"],0,"65 is greater than 60."),
  q(9,"Branch",conditional("grade",8,"grade >= 7","Approved"),["Nothing prints","False","Approved","Error"],2,"The condition is true, so the IF body prints Approved."),
  q(10,"Branch",conditional("grade",5,"grade >= 7","Approved"),["Approved","Nothing prints","Try again","False"],1,"The condition is false. There is no ELSE and nothing prints."),
  q(11,"Boolean",conditional("online",false,"online","Connected"),["Connected","False","Nothing prints","Error"],2,"A false IF condition skips its body. It does not print the condition."),
  q(12,"Branch",conditional("age",15,"age <= 12","Child discount","Regular ticket"),["Child discount","Regular ticket","Both messages","Nothing prints"],1,"15 is above 12, so ELSE chooses the regular ticket."),
  q(13,"Boundary",conditional("temperature",30,"temperature > 30","Fan on","Fan off"),["Fan on","True","Fan off","Error"],2,"30 is not greater than itself. The ELSE body runs."),
  q(14,"Equality",conditional("secret",42,"secret == 42","Unlocked","Denied"),["Unlocked","Denied","42","Error"],0,"The exact match makes the condition true."),
  q(15,"Equality",conditional("likes",100,"likes != 100","Trending","Normal"),["Trending","False","Error","Normal"],3,"100 != 100 is false. ELSE prints Normal."),
  q(16,"Boundary",conditional("views",1000,"views >= 1000","BOOST","NORMAL"),["NORMAL","BOOST","False","Error"],1,">= includes 1000, so this rule prints BOOST."),
  q(17,"Boundary",conditional("views",999,"views > 1000","BOOST","NORMAL"),["BOOST","999","NORMAL","Nothing prints"],2,"999 is below the threshold. ELSE prints NORMAL."),
  q(18,"Boolean",conditional("sponsored",true,"sponsored","Sponsored","Organic"),["Sponsored","Organic","Both","Error"],0,"sponsored is true. Only the IF output runs."),
  q(19,"Boolean",conditional("hasEvidence",false,"hasEvidence","Evidence provided","Needs review"),["Evidence provided","Nothing prints","False","Needs review"],3,"The false condition selects Needs review. Unverified does not mean false."),
  q(20,"Policy",conditional("mentionsInvestigation",true,"mentionsInvestigation","HIDE","SHOW"),["It automatically hides posts because of their topic.","C# cannot use boolean variables.","Every investigation post is necessarily false.","IF statements always print both outcomes."],0,"This rule suppresses a topic without checking the claims. Correct syntax does not guarantee a fair policy.","What is suspicious about this algorithm?"),
];
// The quiz plays as four short rounds of five questions.
export const roundSize = 5;
export const rounds = [
  { name: "Warm-up", focus: "Comparisons" },
  { name: "True or false", focus: "bool and if" },
  { name: "Two paths", focus: "if / else" },
  { name: "On the edge", focus: "Boundaries and the feed" },
];
export type Mission = { id: string; title: string; system: string; variable: string; broken: [string,string]; repaired: [string,string]; choices: string[]; message: string; author: string; post: string; lesson: string; result: string };
export const missions: Mission[] = [
  { id:"forest", title:"The silenced forest", system:"Topic moderation", variable:"mentionsInvestigation", broken:["HIDE","SHOW"], repaired:["SHOW + REVIEW","SHOW"], choices:["HIDE","SHOW","SHOW + REVIEW"], message:"INTERNAL / 04:12 — Remove posts that mention the facilities investigation. Do not wait for a content review.", author:"Forest Observatory · Field notes", post:"Community groups ask whether ECHO data centers affect nearby Amazon waterways. Measurements and environmental claims are still being checked.", lesson:"An algorithm can follow its instructions and still enforce a harmful policy.", result:"The post is no longer hidden just because it mentions an investigation. Its claims can still be checked." },
  { id:"ads", title:"The boost machine", system:"Advertising disclosure", variable:"sponsored", broken:["ORGANIC","SPONSORED"], repaired:["SPONSORED","ORGANIC"], choices:["ORGANIC","SPONSORED"], message:"INTERNAL / 07:30 — Present the paid campaign as ordinary community posts. The current labels are reversed.", author:"ECHO Partners · Paid campaign", post:"A brighter future, powered by ECHO. Discover our new infrastructure campaign.", lesson:"Misleading rules can run without a programming error. Disclosure restores transparency; favorable posts are not always paid.", result:"Paid content now carries a SPONSORED label. Unpaid content remains ORGANIC." },
  { id:"bots", title:"Bot factory", system:"Recommendation rules", variable:"suspectedBot", broken:["BOOST","NORMAL"], repaired:["REVIEW","NORMAL"], choices:["BOOST","REVIEW","NORMAL"], message:"INTERNAL / 09:05 — Accounts flagged for unusual repetition are receiving extra reach. Audit the reward rule.", author:"Signal-027 · Simulation account", post:"ECHO is the future. Share the campaign. ECHO is the future. Share the campaign.", lesson:"A suspicion flag is imperfect. Review it; do not treat suspicion as proof.", result:"Flagged accounts stop receiving automatic boosts and enter review. Normal accounts keep normal visibility." },
  { id:"finale", title:"Who controls the truth?", system:"Final policy audit", variable:"questionsCompany", broken:["HIDE","SHOW"], repaired:["SHOW + REVIEW","SHOW"], choices:["SHOW","SHOW + REVIEW","HIDE"], message:'NEW DIRECTIVE RECEIVED — "To prevent misinformation, hide all posts that question the company until our team approves them."', author:"Lia Costa · Independent journalist (fictional)", post:"What is ECHO’s environmental impact? This report identifies a community interview and a facilities statement as sources. Several claims remain under investigation.", lesson:"SHOW + REVIEW is reasonable for this case: preserve criticism and check claims. It is not a universal answer to every moderation question.", result:"The journalist’s questions stay visible while the unresolved claims receive review." },
];
