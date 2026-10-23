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
    title: 'TRUE OR FALSE',
    focus: 'bool',
    lead: 'A bool holds only true or false. if (hasKey) runs when hasKey is true. == false flips what you need.',
    examples: [{ code: 'false == false', result: true }, { code: 'false == true', result: false }],
    speed: baseRunSpeed,
    coach: ['bool'],
    gates: [
      set(5, 1, [flag('hasKey')], 50, false),
      set(5, 2, [flag('lightsOn', 'false')], 50, true),
      fork(5, 3, [flag('doorLocked')], 50, true),
      fork(5, 4, [flag('hasMap', 'true')], 50, false),
      set(5, 5, [flag('isSafe', 'false')], 50, true, false),
      fork(5, 6, [flag('lightsOn', 'false')], 50, false),
    ],
  },
  {
    id: 6,
    title: 'DOUBLE LOCK',
    focus: '&&',
    lead: '&& joins two conditions. The gate opens only when BOTH sides are TRUE.',
    examples: [{ code: 'true && true', result: true }, { code: 'true && false', result: false }],
    speed: baseRunSpeed,
    coach: ['and'],
    gates: [
      set(6, 1, [cmp('>', 40), flag('hasKey')], 20, false),
      fork(6, 2, [cmp('>', 40), flag('hasKey')], 70, false),
      fork(6, 3, [cmp('>=', 50), flag('lightsOn')], 50, true),
      set(6, 4, [cmp('<=', 30), flag('hasMap', 'true')], 55, false, false),
      fork(6, 5, [cmp('!=', 10), flag('hasKey')], 10, true),
      fork(6, 6, [cmp('>', 80), flag('doorLocked', 'false')], 90, false),
    ],
  },
]

export const levelCount = backroomLevels.length

// Jump barriers start on tape 02, and after a few gates in The Deep.
export function barrierChance(levelIndex: number | null, gateNumber: number): number {
  if (levelIndex === null) return gateNumber >= 3 ? 0.6 : 0
  return levelIndex >= 1 ? 0.55 : 0
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

export function levelUnlocked(index: number, stars: readonly number[], isTeacher: boolean): boolean {
  return isTeacher || index === 0 || (stars[index - 1] ?? 0) > 0
}

export function endlessUnlocked(stars: readonly number[], isTeacher: boolean): boolean {
  return isTeacher || backroomLevels.every((_, index) => (stars[index] ?? 0) > 0)
}

// The next tape to play: the first one not yet cleared, or null when all are done.
export function nextLevelIndex(stars: readonly number[]): number | null {
  const index = backroomLevels.findIndex((_, i) => (stars[i] ?? 0) === 0)
  return index === -1 ? null : index
}
