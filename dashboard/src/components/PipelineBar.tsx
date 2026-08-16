import type { Phase } from '../types'

interface Props { phases: Phase[]; currentPhase: string }

export default function PipelineBar({ phases, currentPhase }: Props) {
  return (
    <div className="pipeline">
      {phases.map((phase, i) => (
        <>
          <div key={phase.name} className="phase-node">
            <div className={`phase-dot ${phase.status}`} title={phase.label}>
              {phase.status === 'completed' ? '✓' : phase.icon}
            </div>
            <div className={`phase-label ${phase.name === currentPhase ? 'active' : ''}`}>
              {phase.label}
            </div>
          </div>
          {i < phases.length - 1 && (
            <div
              key={`conn-${i}`}
              className={`phase-connector ${phase.status === 'completed' ? 'done' : ''}`}
            />
          )}
        </>
      ))}
    </div>
  )
}
