import { ChevronLeft, ChevronRight } from 'lucide-react'
import { conditionCode, gateBool, gateUsesEnergy, type BackroomGate, type GateValues } from './backroomEngine'

const keywords = new Set(['int', 'bool', 'if'])

// A tiny C# highlighter for the handful of tokens the gates use.
export function CodeTokens({ code }: { code: string }) {
  const parts = code.split(/(\s+|&&|==|!=|>=|<=|[><=();])/).filter((part) => part !== '')
  return <>{parts.map((part, index) => {
    const kind = keywords.has(part) ? 'k'
      : part === 'true' || part === 'false' ? 'b'
        : /^\d+$/.test(part) ? 'n'
          : /^(&&|==|!=|>=|<=|[><=])$/.test(part) ? 'o'
            : /^[();]$/.test(part) ? 'p'
              : /^\s+$/.test(part) ? '' : 'v'
    return kind ? <span key={index} className={`br-t-${kind}`}>{part}</span> : <span key={index}>{part}</span>
  })}</>
}

export type CodeTruth = 'true' | 'false' | 'unknown' | 'next'

interface Props {
  gate: BackroomGate
  values: GateValues
  editable: boolean
  truth: CodeTruth
  trueSide: -1 | 1
  label: string
}

export function CodePanel({ gate, values, editable, truth, trueSide, label }: Props) {
  const flag = gateBool(gate)
  const energy = gateUsesEnergy(gate)
  const fork = gate.kind === 'fork'
  return <section className={`br-code ${fork ? 'is-fork' : 'is-set'} is-${truth}`} aria-label={`C# gate code. ${label}`}>
    <header className="br-code-head">
      <span>{label}</span>
      <b>{fork ? 'GIVEN VALUES' : editable ? 'YOU EDIT THE VALUES' : 'GATE CODE'}</b>
    </header>
    <pre>
      {energy && <code className="br-code-line">
        <CodeTokens code="int energy = " />
        {fork ? <span className="br-t-n">{values.energy}</span> : <output className={`br-slot ${editable ? 'is-editable' : ''}`} aria-label={`energy is ${values.energy}`}>{values.energy}</output>}
        <span className="br-t-p">;</span>
      </code>}
      {flag && <code className="br-code-line">
        <CodeTokens code={`bool ${flag} = `} />
        {fork ? <span className="br-t-b">{String(values.flag)}</span> : <output className={`br-slot br-slot--bool ${values.flag ? 'is-on' : 'is-off'} ${editable ? 'is-editable' : ''}`} aria-label={`${flag} is ${values.flag}`}>{String(values.flag)}</output>}
        <span className="br-t-p">;</span>
      </code>}
      <code className="br-code-line br-code-if">
        <CodeTokens code={`if (${conditionCode(gate)})`} />
        {!fork && truth !== 'next' && <span className={`br-truth is-${truth}`} aria-live="polite">{truth === 'unknown' ? '?' : truth.toUpperCase()}</span>}
      </code>
    </pre>
    {fork && <div className={`br-doors ${trueSide < 0 ? 'true-left' : 'true-right'}`} aria-label={`TRUE door on the ${trueSide < 0 ? 'left' : 'right'}, FALSE door on the ${trueSide < 0 ? 'right' : 'left'}`}>
      <span className={trueSide < 0 ? 'is-true' : 'is-false'}><ChevronLeft size={16} /> {trueSide < 0 ? 'TRUE' : 'FALSE'} DOOR</span>
      <span className={trueSide > 0 ? 'is-true' : 'is-false'}>{trueSide > 0 ? 'TRUE' : 'FALSE'} DOOR <ChevronRight size={16} /></span>
    </div>}
  </section>
}
