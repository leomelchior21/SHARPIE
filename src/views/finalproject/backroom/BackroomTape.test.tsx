import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TapeDeck } from './BackroomTape'
import type { TapeCue } from './tapeTimeline'

// Without WebGL the deck runs the same timeline in 2D.
vi.mock('./tapeTimeline', async (importOriginal) => ({ ...await importOriginal<typeof import('./tapeTimeline')>(), supportsWebGL: () => false }))

const label = { number: '03', title: 'EXACTLY', focus: '== !=', stars: 2, deep: false }

describe('Backrooms tape change', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('ejects, loads and plays the tape, then hands over once', () => {
    const cues: TapeCue[] = []
    const done = vi.fn()
    render(<TapeDeck kind="insert" label={label} reduced={false} onCue={(cue) => cues.push(cue)} onDone={done} />)
    expect(screen.getByRole('dialog', { name: 'Loading tape 03' })).toHaveTextContent('EXACTLY')
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText('⏏ EJECT')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText('LOADING')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1300) })
    expect(screen.getByText('▶ PLAY')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cues).toEqual(['eject', 'insert', 'seat', 'clack', 'motor', 'zoom', 'play', 'static'])
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('can be skipped, and a reduced-motion student only sees PLAY', () => {
    const done = vi.fn()
    const view = render(<TapeDeck kind="insert" label={label} reduced={false} onCue={() => undefined} onDone={done} />)
    fireEvent.click(screen.getByRole('button', { name: /SKIP/ }))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(done).toHaveBeenCalledTimes(1)
    view.unmount()

    const quick = vi.fn()
    render(<TapeDeck kind="insert" label={label} reduced onCue={() => undefined} onDone={quick} />)
    expect(screen.getByText('▶ PLAY')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(700) })
    expect(quick).toHaveBeenCalledTimes(1)
  })
})
