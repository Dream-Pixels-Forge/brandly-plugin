import type { ViralityData } from '../types'

interface Props { data: ViralityData }

const SIZE = 120
const R = 48
const CIRCUMFERENCE = 2 * Math.PI * R

function scoreColor(score: number) {
  if (score >= 70) return 'var(--accent)'
  if (score >= 50) return 'var(--phase-running)'
  return 'var(--phase-failed)'
}

export default function ViralityMeter({ data }: Props) {
  const { overallScore, peakHookSecond, sustain, regions } = data
  const dashOffset = CIRCUMFERENCE * (1 - overallScore / 100)
  const color = scoreColor(overallScore)

  return (
    <div className="virality-meter">
      <div className="score-ring">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="score-ring-progress"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="score-label">
          <span className="score-num" style={{ color }}>{overallScore}</span>
          <span className="score-max">/100</span>
        </div>
      </div>

      <div className="virality-details">
        <div className="virality-metrics">
          <div className="virality-metric">
            <div className="virality-metric-label">Peak Hook</div>
            <div className="virality-metric-value stat-amber">@{peakHookSecond}s</div>
          </div>
          <div className="virality-metric">
            <div className="virality-metric-label">Sustain</div>
            <div className="virality-metric-value stat-green">{sustain}%</div>
          </div>
        </div>

        <div className="brain-regions">
          {regions.map(r => (
            <div key={r.name} className="brain-row">
              <span className="brain-name">{r.name}</span>
              <div className="brain-bar-bg">
                <div className="brain-bar-fill" style={{ width: `${r.score}%`, background: r.color }} />
              </div>
              <span className="brain-pct" style={{ color: r.color }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
