import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createBackroomProgress as createSession } from './types'
import { rankBackroomScores, rememberBackroomScore } from './backroomScores'

describe('backroom top scores', () => {
  beforeEach(() => localStorage.clear())

  it('ranks by best gate, breaks ties with XP, and merges a student’s saved scores', () => {
    expect(rankBackroomScores([
      { username: 'maya', name: 'Maya', gates: 5, xp: 80 },
      { username: 'leo', name: 'Leo', gates: 7, xp: 70 },
      { username: 'nia', name: 'Nia', gates: 5, xp: 100 },
      { username: 'maya', name: 'Maya', gates: 3, xp: 110 },
    ])).toEqual([
      { username: 'leo', name: 'Leo', gates: 7, xp: 70 },
      { username: 'maya', name: 'Maya', gates: 5, xp: 110 },
      { username: 'nia', name: 'Nia', gates: 5, xp: 100 },
    ])
  })

  it('keeps scores after a new session and ignores corrupt device data', () => {
    rememberBackroomScore({ ...createSession('Maya'), backroomRunBest: 5, backroomRunXp: 75 })
    const scores = rememberBackroomScore(createSession('Leo'))
    expect(scores).toHaveLength(1)
    expect(scores[0].name).toBe('Maya')
    localStorage.setItem('sharpie.backroom-scores.v1', '{broken')
    expect(rememberBackroomScore(createSession('Leo'))).toEqual([])
  })
})
