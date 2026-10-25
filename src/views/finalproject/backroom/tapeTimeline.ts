// The tape change, shared by the 3D deck and its flat fallback.
export type TapeCue = 'eject' | 'insert' | 'seat' | 'clack' | 'motor' | 'zoom' | 'play' | 'static' | 'rewind'
export type TapeKind = 'insert' | 'rewind'

export interface TapeLabel {
  number: string
  title: string
  focus: string
  stars: number
  deep: boolean
}

// Seconds from the start of the sequence.
export const tapeTimeline: Record<TapeKind, { cues: Array<[number, TapeCue]>; end: number }> = {
  insert: {
    cues: [[0.25, 'eject'], [0.8, 'insert'], [1.5, 'seat'], [1.9, 'clack'], [2.15, 'motor'], [2.7, 'zoom'], [3.55, 'play'], [4.15, 'static']],
    end: 4.45,
  },
  rewind: {
    cues: [[0, 'rewind'], [0.95, 'play']],
    end: 1.35,
  },
}

export function supportsWebGL(): boolean {
  try {
    const probe = document.createElement('canvas')
    return !!(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}
