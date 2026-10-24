import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CodePanel } from './BackroomCode'
import type { BackroomGate } from './backroomEngine'

const gate: BackroomGate = { id: 'g', kind: 'set', clauses: [{ type: 'compare', operator: '>', threshold: 50 }], start: { energy: 20, flag: false }, liveTruth: true }

describe('Backrooms gate code', () => {
  afterEach(cleanup)

  it('keeps the next gate hidden in the corridor and shows it at the gate', () => {
    const { container, rerender } = render(<CodePanel gate={gate} values={gate.start} editable={false} truth="next" trueSide={1} label="NEXT · GATE 02" />)
    expect(screen.getByText('LOADS AT THE GATE')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/50|20/)
    expect(container.querySelectorAll('.br-mask')).toHaveLength(2)

    rerender(<CodePanel gate={gate} values={gate.start} editable truth="false" trueSide={1} label="GATE 02" />)
    expect(container.textContent).toContain('energy > 50')
    expect(container.querySelector('.br-slot')?.textContent).toBe('20')
  })
})
