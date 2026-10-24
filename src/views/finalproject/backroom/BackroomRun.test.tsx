import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { BackroomRun } from './BackroomRun'
import type { BackroomView } from './backroomRenderer'
import { backroomLevels } from './backroomLevels'
import { createBackroomProgress, type BackroomProgress } from './types'

const renderer = vi.hoisted(() => ({ view: null as BackroomView | null }))
vi.mock('./backroomRenderer', () => ({ createBackroomRenderer: () => ({ render: (view: BackroomView) => { renderer.view = view }, resize: () => undefined, dispose: () => undefined }) }))

describe('Backrooms Run', () => {
  let frame: FrameRequestCallback
  let time: number

  beforeEach(() => {
    renderer.view = null
    localStorage.clear()
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    time = 0
    vi.spyOn(performance, 'now').mockReturnValue(0)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const create = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((name, options) => {
      const element = create(name, options)
      if (name === 'canvas') Object.defineProperty(element, 'getContext', { value: () => ({}) })
      return element
    })
  })

  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  function tick() {
    time += 50
    act(() => frame(time))
    return renderer.view!
  }

  // Runs frames in small batches per React update: the simulations need thousands of frames.
  function until(check: () => boolean, limit = 4000) {
    for (let count = 0; count < limit && !check(); count += 4) {
      act(() => { for (let step = 0; step < 4; step += 1) { time += 50; frame(time) } })
    }
    expect(check()).toBe(true)
  }

  function mount(progress: BackroomProgress) {
    const saves: BackroomProgress[] = []
    let current = progress
    const view = render(<BackroomRun progress={current} onProgress={(next) => { saves.push(next); current = next }} onBack={() => undefined} />)
    tick()
    return { saves, rerender: () => view.rerender(<BackroomRun progress={current} onProgress={(next) => { saves.push(next); current = next }} onBack={() => undefined} />) }
  }

  const student = (changes: Partial<BackroomProgress> = {}) => ({ ...createBackroomProgress('Ana', 'ana'), ...changes })

  function playTape(title: string) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }))
    const briefing = screen.getByRole('dialog', { name: 'Briefing' })
    fireEvent.click(within(briefing).getAllByRole('button')[0])
    tick()
  }

  function setEnergy(target: number) {
    const view = renderer.view!
    const current = Number(document.querySelector('.br-slot')?.textContent)
    const key = target > current ? 'ArrowUp' : 'ArrowDown'
    act(() => { for (let count = 0; count < Math.abs(target - current); count += 1) fireEvent.keyDown(document.body, { key }) })
    return view
  }

  it('opens on the tape library and offers the tutorial to a new student', () => {
    mount(student())
    expect(screen.getByRole('button', { name: /START TUTORIAL/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /THE EDGE/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /THE DEEP/ })).toBeDisabled()
  })

  it('pauses the first gate with a guide and resumes once the condition is TRUE', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    mount(student())
    fireEvent.click(screen.getByRole('button', { name: /START TUTORIAL/ }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Briefing' })).getByRole('button', { name: /START TUTORIAL/ }))
    until(() => !!screen.queryByRole('dialog', { name: 'MAKE IT TRUE' }))
    const frozen = tick().depth
    expect(tick().depth).toBe(frozen)
    expect(screen.getByText(/energy is 20, so the condition is FALSE/)).toBeInTheDocument()
    setEnergy(51)
    expect(screen.getByRole('dialog', { name: 'TRUE. THE GATE OPENS.' })).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1200) })
    expect(screen.queryByRole('dialog', { name: /THE GATE OPENS/ })).not.toBeInTheDocument()
    until(() => renderer.view!.phase === 'turn')
    expect(screen.queryByRole('dialog', { name: /SHUT/ })).not.toBeInTheDocument()
  })

  it('skips the tutorial once tape 01 is cleared and explains a closed gate', () => {
    mount(student({ levelStars: [2, 0, 0, 0, 0, 0] }))
    playTape('LIGHTS ON')
    until(() => !!screen.queryByRole('dialog', { name: 'THE GATE STAYED SHUT' }))
    expect(screen.queryByRole('dialog', { name: 'MAKE IT TRUE' })).not.toBeInTheDocument()
    const card = screen.getByRole('dialog', { name: 'THE GATE STAYED SHUT' })
    expect(card).toHaveTextContent('20 > 50')
    expect(card).toHaveTextContent('2 LEFT')
    expect(screen.getByLabelText('2 of 3 batteries', { selector: '.br-osd .br-battery' })).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: /CONTINUE/ }))
    until(() => renderer.view!.phase === 'turn')
  })

  it('costs a battery for the wrong door and shows the evaluation', () => {
    mount(student({ levelStars: [1, 1, 1, 1, 0, 0] }))
    playTape('TWO DOORS')
    until(() => renderer.view!.gateZ - renderer.view!.depth < 9)
    const wrong = renderer.view!.trueSide === -1 ? 'ArrowRight' : 'ArrowLeft'
    fireEvent.keyDown(document.body, { key: wrong })
    for (let count = 0; count < 12; count += 1) tick()
    fireEvent.keyUp(document.body, { key: wrong })
    until(() => !!screen.queryByRole('dialog', { name: 'WRONG DOOR' }))
    const card = screen.getByRole('dialog', { name: 'WRONG DOOR' })
    expect(card).toHaveTextContent('70 > 50')
    expect(card).toHaveTextContent('You took the FALSE door, but the condition is TRUE.')
  })

  it('lets walls slow the run instead of ending it', () => {
    mount(student({ levelStars: [1, 0, 0, 0, 0, 0] }))
    playTape('LIGHTS ON')
    setEnergy(60)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    for (let count = 0; count < 40; count += 1) tick()
    expect(screen.getByText(/WALL SCRAPE/)).toBeInTheDocument()
    expect(renderer.view!.playerX).toBeLessThanOrEqual(0.75)
    expect(screen.queryByRole('dialog', { name: /SIGNAL LOST/ })).not.toBeInTheDocument()
  })

  it('loses the tape after three wrong answers', () => {
    mount(student({ levelStars: [1, 0, 0, 0, 0, 0] }))
    playTape('LIGHTS ON')
    for (let mistake = 0; mistake < 3; mistake += 1) {
      until(() => !!screen.queryByRole('dialog', { name: 'THE GATE STAYED SHUT' }))
      fireEvent.click(screen.getByRole('button', { name: /CONTINUE|SEE RESULTS/ }))
    }
    expect(screen.getByRole('dialog', { name: 'Signal lost' })).toHaveTextContent('SIGNAL LOST')
    expect(screen.getByRole('button', { name: /RETRY TAPE/ })).toBeInTheDocument()
  })

  it('clears a tape with three stars, saves it and offers the next one', () => {
    const { saves } = mount(student({ backroomRunBest: 5 }))
    fireEvent.click(screen.getByRole('button', { name: /START TUTORIAL/ }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Briefing' })).getAllByRole('button')[0])
    const targets = [60, 20, 80, 10]
    backroomLevels[0].gates.forEach((_, index) => {
      until(() => renderer.view!.phase === 'gate' && renderer.view!.gateNumber === index + 1)
      setEnergy(targets[index])
      until(() => renderer.view!.phase === 'turn' || !!screen.queryByRole('dialog', { name: 'Tape cleared' }))
    })
    until(() => !!screen.queryByRole('dialog', { name: 'Tape cleared' }))
    expect(screen.queryByRole('dialog', { name: 'MAKE IT TRUE' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('3 of 3 stars', { selector: '.br-card .br-stars' })).toBeInTheDocument()
    const saved = saves[saves.length - 1]
    expect(saved.levelStars[0]).toBe(3)
    expect(saved.backroomRunGates).toBe(4)
    expect(saved.skills['>']).toEqual({ right: 2, wrong: 0 })
    expect(screen.getByRole('button', { name: /NEXT TAPE/ })).toBeInTheDocument()
  })

  it('opens The Deep after all six tapes and for teachers', () => {
    mount(student({ levelStars: [1, 2, 3, 1, 1, 1] }))
    expect(screen.getByRole('button', { name: /ENTER THE DEEP/ })).toBeInTheDocument()
    cleanup()
    mount({ ...createBackroomProgress('Teacher', 'teacher', true) })
    expect(screen.getByRole('button', { name: /THE DEEP/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /DOUBLE LOCK/ })).toBeEnabled()
  })

  it('pauses with Escape and resumes without losing the run', () => {
    mount(student({ levelStars: [1, 0, 0, 0, 0, 0] }))
    playTape('LIGHTS ON')
    tick()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    const depth = tick().depth
    expect(tick().depth).toBe(depth)
    fireEvent.click(screen.getByRole('button', { name: /KEEP RUNNING/ }))
    expect(tick().depth).toBeGreaterThan(depth)
  })

  it('speeds up after every gate inside a tape', () => {
    mount(student({ levelStars: [1, 0, 0, 0, 0, 0] }))
    playTape('LIGHTS ON')
    const first = tick().pace
    expect(screen.getByLabelText(/^Pace /)).toHaveTextContent('PACE 1.0×')
    until(() => {
      const next = screen.queryByRole('button', { name: /CONTINUE/ })
      if (next) fireEvent.click(next)
      return renderer.view!.gateNumber === 2 && renderer.view!.phase === 'gate'
    })
    expect(renderer.view!.pace).toBeGreaterThan(first)
    expect(screen.getByLabelText(/^Pace /)).toHaveTextContent('PACE 1.1×')
  }, 60000)

  it('restarts a lost tutorial tape straight away without repeating its guides', { timeout: 60000 }, () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const { saves } = mount(student())
    fireEvent.click(screen.getByRole('button', { name: /START TUTORIAL/ }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Briefing' })).getByRole('button', { name: /START TUTORIAL/ }))
    until(() => !!screen.queryByRole('dialog', { name: 'MAKE IT TRUE' }))
    setEnergy(51)
    act(() => { vi.advanceTimersByTime(1200) })
    until(() => !!screen.queryByRole('dialog', { name: 'FOLLOW THE CORRIDOR' }))
    fireEvent.click(screen.getByRole('button', { name: 'GOT IT' }))
    for (let mistake = 0; mistake < 3; mistake += 1) {
      until(() => !!screen.queryByRole('dialog', { name: 'THE GATE STAYED SHUT' }))
      fireEvent.click(screen.getByRole('button', { name: /CONTINUE|SEE RESULTS/ }))
    }
    expect(saves[saves.length - 1].coachSeen).toEqual(['energy', 'steer'])
    fireEvent.click(screen.getByRole('button', { name: /RETRY TAPE/ }))
    expect(screen.queryByRole('dialog', { name: 'Briefing' })).not.toBeInTheDocument()
    until(() => !!screen.queryByRole('dialog', { name: 'THE GATE STAYED SHUT' }))
    expect(screen.queryByRole('dialog', { name: 'MAKE IT TRUE' })).not.toBeInTheDocument()
  })

  it('jumps a barrier with Space instead of tripping over it', () => {
    mount(student({ levelStars: [1, 1, 0, 0, 0, 0] }))
    playTape('THE EDGE')
    const barrierAhead = () => renderer.view!.obstacles.some((item) => item.kind === 'barrier' && item.z - renderer.view!.depth > 0.3 && item.z - renderer.view!.depth < 1.2)
    until(() => {
      const next = screen.queryByRole('button', { name: /CONTINUE/ })
      if (next) fireEvent.click(next)
      return barrierAhead()
    }, 8000)
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(tick().jump).toBeGreaterThan(0)
    for (let count = 0; count < 20; count += 1) tick()
    expect(screen.queryByText(/TRIPPED/)).not.toBeInTheDocument()
    expect(renderer.view!.obstacles.some((item) => item.kind === 'barrier')).toBe(true)
    expect(renderer.view!.jump).toBe(0)
  }, 60000)
})
