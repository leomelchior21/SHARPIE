export type VariableRunLesson = {
  id: number;
  type: "multiple-choice" | "blocks" | "final";
  title: string;
  eyebrow: string;
  code?: string;
  question: string;
  answers?: string[];
  correct?: number;
  blocks?: string[];
  expectedBlocks?: string[];
  feedback: string;
  hint: string;
  finalCode?: string;
};

export const variableRunLessons: VariableRunLesson[] = [
  {
    id: 1,
    type: "multiple-choice",
    eyebrow: "NAME THE MEMORY",
    title: "Find the variable name",
    code: 'string playerName = "Alex";',
    question: "What is the variable name?",
    answers: ["string", "playerName", "Alex"],
    correct: 1,
    feedback: "playerName is the name of the memory.",
    hint: "Look for the part that gives the stored information its name.",
  },
  {
    id: 2,
    type: "multiple-choice",
    eyebrow: "READ THE MEMORY",
    title: "Find the value",
    code: "int score = 25;",
    question: "What value is stored in score?",
    answers: ["score", "int", "25"],
    correct: 2,
    feedback: "25 is the value stored in score.",
    hint: "The value appears after the equals sign.",
  },
  {
    id: 3,
    type: "multiple-choice",
    eyebrow: "CHECK THE TYPE",
    title: "Find the type",
    code: 'string city = "Tokyo";',
    question: "What type of information can city store?",
    answers: ["Text", "A whole number", "A command"],
    correct: 0,
    feedback: "string stores text.",
    hint: "Read the first word in the code.",
  },
  {
    id: 4,
    type: "multiple-choice",
    eyebrow: "CHOOSE A TYPE",
    title: "Store a player name",
    question: "Store the player's name Maya.",
    answers: ['string playerName = "Maya";', 'int playerName = "Maya";'],
    correct: 0,
    feedback: "Names are text, so this memory uses string.",
    hint: "Maya is text inside quotation marks.",
  },
  {
    id: 5,
    type: "multiple-choice",
    eyebrow: "CHOOSE A TYPE",
    title: "Store an age",
    question: "Store age 14.",
    answers: ['string age = "14";', "int age = 14;"],
    correct: 1,
    feedback: "14 is a whole number, so this memory uses int.",
    hint: "A whole number does not need quotation marks.",
  },
  {
    id: 6,
    type: "blocks",
    eyebrow: "BUILD THE CODE",
    title: "Build a string variable",
    question: "Tap the blocks in the right order.",
    blocks: ["favoriteFood", '"Pizza"', ";", "string", "="],
    expectedBlocks: ["string", "favoriteFood", "=", '"Pizza"', ";"],
    feedback: "You created a text memory called favoriteFood.",
    hint: "Start with the type, then the name, equals sign, value, and semicolon.",
    code: '// Build: string favoriteFood = "Pizza";',
  },
  {
    id: 7,
    type: "blocks",
    eyebrow: "BUILD THE CODE",
    title: "Build an int variable",
    question: "Build a memory that stores level 7.",
    blocks: ["7", "=", "int", ";", "level"],
    expectedBlocks: ["int", "level", "=", "7", ";"],
    feedback: "You created a number memory called level.",
    hint: "This follows the same five-part pattern as the last challenge.",
    code: "// Build: int level = 7;",
  },
  {
    id: 8,
    type: "multiple-choice",
    eyebrow: "RETRIEVE MEMORY",
    title: "Send it to the console",
    code: 'string name = "Leo";\n\nConsole.WriteLine(name);',
    question: "What appears in the console?",
    answers: ["name", '"Leo"', "Leo"],
    correct: 2,
    feedback: "WriteLine retrieves the value Leo.",
    hint: "The variable name is replaced by what it remembers.",
  },
  {
    id: 9,
    type: "multiple-choice",
    eyebrow: "UPDATE MEMORY",
    title: "Same variable, new value",
    code: "int score = 10;\n\nscore = 30;\n\nConsole.WriteLine(score);",
    question: "What does score remember now?",
    answers: ["10", "30", "score"],
    correct: 1,
    feedback: "Same variable. New value.",
    hint: "The latest value replaces the earlier one.",
  },
  {
    id: 10,
    type: "final",
    eyebrow: "FINAL CHALLENGE",
    title: "Text + variable",
    code: 'string name = "Luna";\nint score = 250;\n\nConsole.WriteLine("Player: " + name);\nConsole.WriteLine("Score: " + score);',
    question: "Predict the two console lines.",
    answers: ["Player: name\nScore: score", "Player: Luna\nScore: 250", '"Player: Luna"\n"Score: 250"'],
    correct: 1,
    blocks: ["250", ";", "name", "int", '"Luna"', "=", "score", "string", ";", "="],
    expectedBlocks: ["string", "name", "=", '"Luna"', ";", "int", "score", "=", "250", ";"],
    feedback: "You built both memories and predicted their output.",
    hint: "First read each stored value. Then build type, name, equals, value, semicolon—twice.",
    finalCode: 'string name = "Luna";\nint score = 250;',
  },
];
