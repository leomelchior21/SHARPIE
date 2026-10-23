import { describe, expect, it } from "vitest";
import { comparisonOperators, energyRange, evaluateGate, gateSkills } from './backroomEngine'
import { backroomLevels, endlessUnlocked, levelUnlocked, nextLevelIndex, normalizeStars, starsFor } from './backroomLevels'

describe('Backrooms tapes', () => {
  it('teach every comparison, bool and && across six tapes', () => {
    expect(backroomLevels).toHaveLength(6)
    const skills = new Set(backroomLevels.flatMap((level) => level.gates.flatMap(gateSkills)))
    for (const operator of comparisonOperators) expect(skills).toContain(operator)
    expect(skills).toContain('bool')
    expect(skills).toContain('&&')
  })

  it('starts every editable gate FALSE and keeps it reachable', () => {
    for (const level of backroomLevels) {
      for (const gate of level.gates.filter((item) => item.kind === 'set')) {
        expect(evaluateGate(gate, gate.start), gate.id).toBe(false)
        let solvable = false
        for (let energy = energyRange.min; energy <= energyRange.max; energy += 1) {
          if (evaluateGate(gate, { energy, flag: true }) || evaluateGate(gate, { energy, flag: false })) solvable = true
        }
        expect(solvable, gate.id).toBe(true)
      }
    }
  })

  it('balances TRUE and FALSE doors on the fork tapes', () => {
    for (const level of backroomLevels) {
      const forks = level.gates.filter((gate) => gate.kind === 'fork')
      if (forks.length < 3) continue
      const trueDoors = forks.filter((gate) => evaluateGate(gate, gate.start)).length
      const least = Math.floor(forks.length / 3)
      expect(trueDoors, level.title).toBeGreaterThanOrEqual(least)
      expect(forks.length - trueDoors, level.title).toBeGreaterThanOrEqual(least)
    }
  })

  it('tests the edge on purpose where it matters', () => {
    const edge = backroomLevels[3].gates.filter((gate) => gate.clauses.some((clause) => clause.type === 'compare' && clause.threshold === gate.start.energy))
    expect(edge.length).toBeGreaterThanOrEqual(3)
  })

  it('shows live TRUE/FALSE only on the early tapes', () => {
    expect(backroomLevels.slice(0, 3).every((level) => level.gates.every((gate) => gate.liveTruth))).toBe(true)
    expect(backroomLevels[5].gates.some((gate) => gate.kind === 'set' && !gate.liveTruth)).toBe(true)
  })

  it('unlocks tapes in order and The Deep after all six', () => {
    const none = normalizeStars([])
    expect(levelUnlocked(0, none, false)).toBe(true)
    expect(levelUnlocked(1, none, false)).toBe(false)
    expect(levelUnlocked(1, [2, 0, 0, 0, 0, 0], false)).toBe(true)
    expect(endlessUnlocked([3, 3, 3, 3, 3, 0], false)).toBe(false)
    expect(endlessUnlocked([1, 1, 1, 1, 1, 1], false)).toBe(true)
    expect(endlessUnlocked(none, true)).toBe(true)
    expect(levelUnlocked(5, none, true)).toBe(true)
  })

  it('points to the first unfinished tape and scores mistakes as stars', () => {
    expect(nextLevelIndex([3, 1, 0, 0, 0, 0])).toBe(2)
    expect(nextLevelIndex([1, 1, 1, 1, 1, 1])).toBeNull()
    expect([starsFor(0), starsFor(1), starsFor(2)]).toEqual([3, 2, 1])
    expect(normalizeStars([9, -1, 2.5, 2])).toEqual([3, 0, 0, 2, 0, 0])
  })
})
