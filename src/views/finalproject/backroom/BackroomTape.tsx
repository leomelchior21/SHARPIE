import { useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import { supportsWebGL, tapeTimeline, type TapeCue, type TapeKind, type TapeLabel } from './tapeTimeline'

interface Props {
  kind: TapeKind
  label: TapeLabel
  reduced: boolean
  onCue: (cue: TapeCue) => void
  onDone: () => void
}

// The tape change: a 3D camcorder takes the tape before a run; a retry rewinds it.
export function TapeDeck({ kind, label, reduced, onCue, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState<TapeCue | 'start'>('start')
  const [mode, setMode] = useState<'loading' | '3d' | 'flat'>(kind === 'insert' ? 'loading' : 'flat')
  const callbacks = useRef({ onCue, onDone })
  callbacks.current = { onCue, onDone }
  const finished = useRef(false)

  useEffect(() => {
    const cue = (next: TapeCue) => { setStage(next); callbacks.current.onCue(next) }
    const finish = () => { if (!finished.current) { finished.current = true; callbacks.current.onDone() } }
    let disposed = false
    let handle: { dispose(): void } | null = null
    const timers: number[] = []
    const flat = () => {
      setMode('flat')
      const { cues, end } = tapeTimeline[kind]
      cues.forEach(([at, name]) => timers.push(window.setTimeout(() => cue(name), at * 1000)))
      timers.push(window.setTimeout(finish, end * 1000))
    }
    if (reduced) {
      setMode('flat')
      setStage('play')
      timers.push(window.setTimeout(finish, 700))
    } else if (kind === 'insert' && supportsWebGL()) {
      let drawing = false
      // A scene that never draws must not hold the student at a black screen.
      timers.push(window.setTimeout(() => { if (!drawing) finish() }, 8000))
      import('./tapeDeckScene')
        .then((module) => {
          if (disposed) return
          handle = canvasRef.current ? module.createTapeDeckScene(canvasRef.current, label, cue, finish, () => { drawing = true; setMode('3d') }) : null
          if (!handle) { drawing = true; flat() }
        })
        .catch(() => { if (!disposed) flat() })
    } else flat()
    return () => {
      disposed = true
      handle?.dispose()
      timers.forEach((id) => window.clearTimeout(id))
    }
    // The sequence runs once per mount; the parent remounts it for every tape.
  }, [])

  const skip = () => { if (!finished.current) { finished.current = true; callbacks.current.onDone() } }
  const status = stage === 'eject' ? '⏏ EJECT' : stage === 'insert' || stage === 'seat' || stage === 'clack' ? 'TAPE IN' : stage === 'motor' || stage === 'zoom' ? 'LOADING' : ''

  return <div className={`br-deck br-deck--${kind} is-${mode} stage-${stage}`} role="dialog" aria-label={`Loading tape ${label.number}`}>
    {kind === 'insert' && <canvas ref={canvasRef} className="br-deck-canvas" aria-hidden="true" />}
    {kind === 'insert' && mode === 'flat' && <div className="br-deck-flat" aria-hidden="true">
      <div className="br-deck-cassette">
        <div className="br-deck-window"><i /><i /></div>
        <div className={`br-deck-label ${label.deep ? 'is-deep' : ''}`}>
          <small>{label.deep ? 'DO NOT PLAY' : 'LEVEL 0 · FOUND FOOTAGE'}<b>TAPE {label.number}</b></small>
          <strong>{label.title}</strong>
          <em>{label.focus}</em>
        </div>
      </div>
    </div>}
    {kind === 'rewind' && <div className="br-deck-rewind" aria-hidden="true"><i /><i /><i /><i /></div>}

    <div className="br-deck-osd">
      <span className="br-deck-kicker">{kind === 'rewind' ? 'REWIND' : `TAPE ${label.number}`} · {label.title}</span>
      {kind === 'rewind' && stage !== 'play' && <b className="br-deck-rew">◀◀ REW</b>}
      {status && <b className="br-deck-status" key={status}>{status}{status === 'LOADING' && <i><span /><span /><span /></i>}</b>}
    </div>

    {stage === 'play' || stage === 'static' ? <div className={`br-deck-blue ${kind === 'rewind' ? 'is-clear' : ''}`} aria-hidden="true">
      <span className="br-deck-play">▶ PLAY</span>
      <span className="br-deck-sp">SP</span>
      {kind === 'insert' && <strong>TAPE {label.number}<small>{label.title}</small></strong>}
      <span className="br-deck-counter">0:00:00</span>
      <i className="br-deck-tracking" />
    </div> : null}
    {stage === 'static' && <div className="br-deck-static" aria-hidden="true" />}

    <button className="br-deck-skip" onClick={skip}>SKIP <SkipForward size={14} /></button>
  </div>
}
