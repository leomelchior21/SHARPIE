import { comparisonOperators, skillKeys } from './backroom/backroomEngine'
import { coachMoments, levelCount, migrateTapeStars, normalizeStars } from './backroom/backroomLevels'
import { createBackroomProgress, type BackroomProgress, type SkillRecord } from './backroom/types'

// Backrooms Run is a plain web game: its progress lives on this device only and never reaches
// Supabase or the teacher dashboard.
const storageKey = (student: string) => `sharpie.backroom.v1.${encodeURIComponent(student.trim().toLowerCase())}`

interface Player { username: string; name: string; isTeacher: boolean }

export function loadBackroomProgress(player: Player): BackroomProgress {
  try {
    const raw = localStorage.getItem(storageKey(player.username))
    if (raw) return cleanBackroomProgress(player, JSON.parse(raw))
  } catch { /* The game still plays when device storage is unavailable. */ }
  return createBackroomProgress(player.name, player.username, player.isTeacher)
}

export function saveBackroomProgress(progress: BackroomProgress) {
  const { backroomRunBest, backroomRunXp, backroomRunGates, backroomRunOperators, levelStars, skills, coachSeen } = progress
  const stored = { backroomRunBest, backroomRunXp, backroomRunGates, backroomRunOperators, levelStars, skills, coachSeen }
  try { localStorage.setItem(storageKey(progress.username), JSON.stringify(stored)) } catch { /* Storage is optional. */ }
}

/** Stage 01 of the Final Project: every tape cleared, or three gates in the original game. */
export function backroomStageDone(progress: BackroomProgress): boolean {
  return progress.backroomRunBest >= 3 || (progress.levelStars.length === levelCount && progress.levelStars.every((stars) => stars > 0))
}

/**
 * Final Project saves from before Backrooms Run left the synced progress still carry its fields
 * (`best` and `backroom`). They move to the game's own save once, so nobody loses their tapes.
 */
export function adoptLegacyBackroom(student: string, legacy: unknown) {
  if (!legacy || typeof legacy !== 'object') return
  const { best, backroom } = legacy as { best?: unknown; backroom?: Record<string, unknown> }
  if (typeof best !== 'number' && (!backroom || typeof backroom !== 'object')) return
  try {
    if (localStorage.getItem(storageKey(student))) return
  } catch { return }
  const old = backroom && typeof backroom === 'object' ? backroom : {}
  const levels = Array.isArray(old.levels) ? old.levels : []
  const layout = old.layout
  const runBest = wholeNumber(best, 100000)
  saveBackroomProgress(cleanBackroomProgress({ username: student, name: student, isTeacher: false }, {
    backroomRunBest: runBest,
    backroomRunXp: typeof old.bestXp === 'number' ? old.bestXp : runBest * 15,
    backroomRunGates: Math.max(runBest, wholeNumber(old.gates, 10000000)),
    backroomRunOperators: old.operators,
    // Stars from the six-tape layouts follow their tapes into the four tapes.
    levelStars: layout === 3 ? levels : migrateTapeStars(levels, layout === 2 ? 2 : 1),
    skills: old.skills,
    coachSeen: old.coach,
  }))
}

function cleanBackroomProgress(player: Player, value: unknown): BackroomProgress {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const list = (item: unknown) => Array.isArray(item) ? item : []
  return {
    ...createBackroomProgress(player.name, player.username, player.isTeacher),
    backroomRunBest: wholeNumber(data.backroomRunBest, 100000),
    backroomRunXp: wholeNumber(data.backroomRunXp, 1500000),
    backroomRunGates: wholeNumber(data.backroomRunGates, 10000000),
    backroomRunOperators: comparisonOperators.filter((operator) => list(data.backroomRunOperators).includes(operator)),
    levelStars: normalizeStars(list(data.levelStars)),
    skills: cleanSkills(data.skills),
    coachSeen: coachMoments.filter((moment) => list(data.coachSeen).includes(moment)),
  }
}

function cleanSkills(value: unknown): SkillRecord {
  if (!value || typeof value !== 'object') return {}
  const skills: SkillRecord = {}
  for (const key of skillKeys) {
    const record = (value as Record<string, unknown>)[key]
    if (record && typeof record === 'object') {
      const { right, wrong } = record as { right?: unknown; wrong?: unknown }
      skills[key] = { right: wholeNumber(right, 1000000), wrong: wholeNumber(wrong, 1000000) }
    }
  }
  return skills
}

function wholeNumber(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0
}
