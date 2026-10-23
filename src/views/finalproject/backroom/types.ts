import type { ComparisonOperator } from './backroomEngine'

export interface BackroomProgress {
  username: string
  name: string
  isTeacher: boolean
  backroomRunBest: number
  backroomRunXp: number
  backroomRunGates: number
  backroomRunOperators: ComparisonOperator[]
}

export function createBackroomProgress(name: string, username = name.toLowerCase(), isTeacher = false): BackroomProgress {
  return { name, username, isTeacher, backroomRunBest: 0, backroomRunXp: 0, backroomRunGates: 0, backroomRunOperators: [] }
}
