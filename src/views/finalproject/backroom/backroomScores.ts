import { supabase } from '../../../lib/supabase'
import type { BackroomProgress } from './types'

export interface BackroomScore {
  username: string
  name: string
  gates: number
  xp: number
}

const storageKey = 'sharpie.backroom-scores.v1'

export function rankBackroomScores(scores: BackroomScore[], limit = boardSize): BackroomScore[] {
  const best = new Map<string, BackroomScore>()
  for (const score of scores) {
    if (!score || typeof score.username !== 'string' || !score.username || typeof score.name !== 'string' || !score.name || !Number.isSafeInteger(score.gates) || score.gates < 1 || !Number.isSafeInteger(score.xp) || score.xp < 0) continue
    const previous = best.get(score.username)
    best.set(score.username, previous ? { ...score, gates: Math.max(previous.gates, score.gates), xp: Math.max(previous.xp, score.xp) } : score)
  }
  return [...best.values()].sort((a, b) => b.gates - a.gates || b.xp - a.xp || a.name.localeCompare(b.name)).slice(0, limit)
}

// Guests share one profile on a device, so each one types a name and their own
// runs in The Deep are recorded under it.
export function isGuestName(name: string): boolean {
  const trimmed = name.trim().toLowerCase()
  return !trimmed || trimmed === 'guest'
}

export function playerKey(name: string): string {
  return `player:${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
}

function storedScores(): BackroomScore[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(data)) return data.filter((row): row is BackroomScore => !!row && typeof row === 'object' && typeof row.username === 'string' && typeof row.name === 'string')
  } catch { /* Scores still work when device storage is unavailable. */ }
  return []
}

// With an entry, records that run; without one, records the profile's best (none for guests or teachers).
export function rememberBackroomScore(progress: BackroomProgress, entry?: BackroomScore): BackroomScore[] {
  const stored = storedScores()
  if (progress.isTeacher) return rankBackroomScores(stored)
  const score = entry ?? (isGuestName(progress.name) ? null : { username: progress.username, name: progress.name, gates: progress.backroomRunBest, xp: progress.backroomRunXp })
  if (!score) return rankBackroomScores(stored)
  const scores = rankBackroomScores([...stored, score])
  try { localStorage.setItem(storageKey, JSON.stringify(scores)) } catch { /* Storage is optional. */ }
  return scores
}

// The class board lives in Supabase (sharpie_backroom_scores); device scores fill in
// while it is offline or before the table exists.
function isMissingRelation(message: string) {
  return /does not exist|could not find the (table|function)|schema cache/i.test(message)
}

let remoteAvailable = true
// The class ranking every student sees.
export const boardSize = 20

export async function fetchBackroomScores(): Promise<BackroomScore[]> {
  if (!supabase || !remoteAvailable) return []
  const { data, error } = await supabase
    .from('sharpie_backroom_scores')
    .select('player_key,display_name,gates,xp')
    .order('gates', { ascending: false })
    .order('xp', { ascending: false })
    .limit(boardSize)
  if (error) {
    if (isMissingRelation(error.message)) remoteAvailable = false
    return []
  }
  return (data ?? []).map((row) => ({ username: String(row.player_key), name: String(row.display_name), gates: Number(row.gates), xp: Number(row.xp) }))
}

export async function submitBackroomScore(score: BackroomScore): Promise<void> {
  if (!supabase || !remoteAvailable || score.gates < 1) return
  const { error } = await supabase.rpc('sharpie_record_backroom_score', { p_key: score.username, p_name: score.name, p_gates: score.gates, p_xp: score.xp })
  if (error && isMissingRelation(error.message)) remoteAvailable = false
}

// Device scores right away, then the class board merged in when it answers. Runs this
// device recorded are sent up too, so the ranking gathers every run from every device.
export function loadBackroomScores(local: BackroomScore[], onScores: (scores: BackroomScore[]) => void, submit?: BackroomScore): void {
  onScores(local)
  void (async () => {
    try {
      const outgoing = submit ? [submit, ...local.filter((score) => score.username !== submit.username)] : local
      for (const score of outgoing) await submitBackroomScore(score)
      const remote = await fetchBackroomScores()
      if (remote.length) onScores(rankBackroomScores([...local, ...remote], boardSize))
    } catch { /* Offline: the device scores stay on screen. */ }
  })()
}
