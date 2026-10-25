import { baseRunSpeed, type BackroomGate, type BoolName, type Clause, type ComparisonOperator } from './backroomEngine'

export type CoachMoment = 'energy' | 'steer' | 'jump' | 'fork' | 'bool' | 'and'
export const coachMoments: CoachMoment[] = ['energy', 'steer', 'jump', 'fork', 'bool', 'and']

export interface BackroomLevel {
  id: number
  title: string
  focus: string
  lead: string
  examples: Array<{ code: string; result: boolean }>
  speed: number
  // Guided pauses shown only until the student has cleared this level once.
  coach: CoachMoment[]
  gates: BackroomGate[]
}

export const maxBatteries = 3

const cmp = (operator: ComparisonOperator, threshold: number): Clause => ({ type: 'compare', operator, threshold })
const flag = (name: BoolName, form: 'plain' | 'true' | 'false' = 'plain'): Clause => ({ type: 'bool', name, form })

function set(level: number, index: number, clauses: Clause[], energy: number, value = false, liveTruth = true): BackroomGate {
  return { id: `tape-${level}-${index}`, kind: 'set', clauses, start: { energy, flag: value }, liveTruth }
}

function fork(level: number, index: number, clauses: Clause[], energy: number, value = false): BackroomGate {
  return { id: `tape-${level}-${index}`, kind: 'fork', clauses, start: { energy, flag: value }, liveTruth: false }
}

export const backroomLevels: BackroomLevel[] = [
  {
    id: 1,
    title: 'LIGHTS ON',
    focus: '>  <',
    lead: 'A gate only opens when its condition is TRUE. Change energy until it is.',
    examples: [{ code: '70 > 50', result: true }, { code: '30 < 10', result: false }],
    speed: baseRunSpeed * 0.82,
    coach: ['energy', 'steer'],
    gates: [
      set(1, 1, [cmp('>', 50)], 20),
      set(1, 2, [cmp('<', 30)], 70),
      set(1, 3, [cmp('>', 75)], 45),
      set(1, 4, [cmp('<', 15)], 50),
    ],
  },
  {
    id: 2,
    title: 'THE EDGE',
    focus: '>=  <=',
    lead: '>= and <= include the edge. > and < do not. Watch the exact number where the gate flips.',
    examples: [{ code: '40 >= 40', result: true }, { code: '40 > 40', result: false }],
    speed: baseRunSpeed * 0.9,
    coach: ['jump'],
    gates: [
      set(2, 1, [cmp('>=', 40)], 26),
      set(2, 2, [cmp('<=', 60)], 78),
      set(2, 3, [cmp('>', 70)], 56),
      set(2, 4, [cmp('>=', 85)], 70),
      set(2, 5, [cmp('<', 20)], 34),
    ],
  },
  {
    id: 3,
    title: 'EXACTLY',
    focus: '==  !=',
    lead: '== needs the exact same number. != is true for every number except one.',
    examples: [{ code: '50 == 50', result: true }, { code: '50 != 50', result: false }],
    speed: baseRunSpeed * 0.95,
    coach: [],
    gates: [
      set(3, 1, [cmp('==', 50)], 36),
      set(3, 2, [cmp('!=', 50)], 50),
      set(3, 3, [cmp('==', 25)], 40),
      set(3, 4, [cmp('!=', 0)], 0),
      set(3, 5, [cmp('==', 80)], 64),
    ],
  },
  {
    id: 4,
    title: 'TWO DOORS',
    focus: 'TRUE | FALSE',
    lead: 'Now the code sets energy. Read the condition, decide TRUE or FALSE, and steer into that door.',
    examples: [{ code: '70 > 50', result: true }, { code: '25 > 25', result: false }],
    speed: baseRunSpeed * 0.95,
    coach: ['fork'],
    gates: [
      fork(4, 1, [cmp('>', 50)], 70),
      fork(4, 2, [cmp('>=', 45)], 30),
      fork(4, 3, [cmp('<=', 60)], 60),
      fork(4, 4, [cmp('>', 25)], 25),
      fork(4, 5, [cmp('!=', 50)], 50),
      fork(4, 6, [cmp('<', 20)], 12),
    ],
  },
  {
    id: 5,
    title: 'NO LIGHT',
    focus: 'all  ?',
    lead: 'From here no light says TRUE or FALSE. Read the condition, set energy and trust your reading. Watch the edges: >= and <= include the number itself.',
    examples: [{ code: '50 >= 50', result: true }, { code: '50 > 50', result: false }],
    speed: baseRunSpeed,
    coach: [],
    gates: [
      set(5, 1, [cmp('>=', 60)], 52, false, false),
      set(5, 2, [cmp('<', 35)], 41, false, false),
      set(5, 3, [cmp('==', 45)], 39, false, false),
      set(5, 4, [cmp('<=', 20)], 27, false, false),
      set(5, 5, [cmp('!=', 70)], 70, false, false),
      set(5, 6, [cmp('>', 85)], 80, false, false),
    ],
  },
  {
    id: 6,
    title: 'FINAL CUT',
    focus: 'doors + edges',
    lead: 'Everything together: gates you set and door pairs you choose, many right on the edge. No light helps you; only your reading does.',
    examples: [{ code: '30 <= 30', result: true }, { code: '75 != 75', result: false }],
    speed: baseRunSpeed * 1.05,
    coach: [],
    gates: [
      fork(6, 1, [cmp('>=', 40)], 40),
      set(6, 2, [cmp('>', 65)], 60, false, false),
      fork(6, 3, [cmp('<', 25)], 25),
      fork(6, 4, [cmp('!=', 55)], 56),
      set(6, 5, [cmp('<=', 15)], 22, false, false),
      fork(6, 6, [cmp('==', 90)], 91),
    ],
  },
]

export const levelCount = backroomLevels.length

// Jumps start on tape 02, and after a few gates in The Deep. Most corridors have one;
// later tapes often add a second.
export function barrierChance(levelIndex: number | null, gateNumber: number): number {
  if (levelIndex === null) return gateNumber >= 3 ? 0.85 : 0
  return levelIndex >= 1 ? 0.85 : 0
}

export function secondJumpChance(levelIndex: number | null, gateNumber: number): number {
  if (levelIndex === null) return gateNumber >= 5 ? 0.65 : 0
  return levelIndex >= 2 ? 0.6 : levelIndex === 1 ? 0.35 : 0
}

// Holes in the floor join the barriers from tape 03, and later in The Deep.
export function holeShare(levelIndex: number | null, gateNumber: number): number {
  if (levelIndex === null) return gateNumber >= 6 ? 0.45 : 0
  return levelIndex >= 2 ? 0.45 : 0
}

// Saws come out of the walls from tape 02, and after a few gates in The Deep.
export function sawShare(levelIndex: number | null, gateNumber: number): number {
  if (levelIndex === null) return gateNumber >= 4 ? 0.35 : 0
  return levelIndex >= 1 ? 0.35 : 0
}

// Spare batteries turn up only when the camcorder is missing charge, and always when it is dead.
export function batteryChance(batteries: number): number {
  return batteries <= 0 ? 1 : batteries < maxBatteries ? 0.4 : 0
}

export function starsFor(mistakes: number): number {
  return mistakes <= 0 ? 3 : mistakes === 1 ? 2 : 1
}

export function normalizeStars(stars: readonly number[] | undefined): number[] {
  return backroomLevels.map((_, index) => {
    const value = stars?.[index]
    return typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(3, value)) : 0
  })
}

// Tapes open one at a time; unlockAll is the teacher preview.
export function levelUnlocked(index: number, stars: readonly number[], unlockAll: boolean): boolean {
  return unlockAll || index === 0 || (stars[index - 1] ?? 0) > 0
}

export function endlessUnlocked(stars: readonly number[], unlockAll: boolean): boolean {
  return unlockAll || backroomLevels.every((_, index) => (stars[index] ?? 0) > 0)
}

// The next tape to play: the first one not yet cleared, or null when all are done.
export function nextLevelIndex(stars: readonly number[]): number | null {
  const index = backroomLevels.findIndex((_, i) => (stars[i] ?? 0) === 0)
  return index === -1 ? null : index
}
