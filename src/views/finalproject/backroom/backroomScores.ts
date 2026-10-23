import type { BackroomProgress } from './types'

export interface BackroomScore {
  username: string
  name: string
  gates: number
  xp: number
}

const storageKey = 'sharpie.backroom-scores.v1'

export function rankBackroomScores(scores: BackroomScore[]): BackroomScore[] {
  const best = new Map<string, BackroomScore>()
  for (const score of scores) {
    if (!score || typeof score.username !== 'string' || !score.username || typeof score.name !== 'string' || !score.name || !Number.isSafeInteger(score.gates) || score.gates < 1 || !Number.isSafeInteger(score.xp) || score.xp < 0) continue
    const previous = best.get(score.username)
    best.set(score.username, previous ? { ...score, gates: Math.max(previous.gates, score.gates), xp: Math.max(previous.xp, score.xp) } : score)
  }
  return [...best.values()].sort((a, b) => b.gates - a.gates || b.xp - a.xp || a.name.localeCompare(b.name)).slice(0, 5)
}

export function rememberBackroomScore(progress: BackroomProgress): BackroomScore[] {
  let stored: BackroomScore[] = []
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(data)) stored = data.filter((row): row is BackroomScore => !!row && typeof row === 'object' && typeof row.username === 'string' && typeof row.name === 'string')
  } catch { /* Scores still work when device storage is unavailable. */ }
  if (progress.isTeacher) return rankBackroomScores(stored)
  const scores = rankBackroomScores([...stored, { username: progress.username, name: progress.name, gates: progress.backroomRunBest, xp: progress.backroomRunXp }])
  try { localStorage.setItem(storageKey, JSON.stringify(scores)) } catch { /* Storage is optional. */ }
  return scores
}
