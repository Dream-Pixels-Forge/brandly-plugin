import ViralityMeter from '../components/ViralityMeter'
import type { Project } from '../types'

interface Props { project: Project }

const THRESHOLDS = [
  { range: '> 70',  label: 'Ready to publish',         color: 'var(--accent)',        icon: '🚀' },
  { range: '50–70', label: 'Minor improvements needed', color: 'var(--phase-running)', icon: '⚡' },
  { range: '< 50',  label: 'Must re-edit',              color: 'var(--phase-failed)',  icon: '✕' },
  { range: 'DM > 60', label: 'Too much mind-wandering', color: 'var(--phase-failed)',  icon: '⚠️' },
]

export default function ValidatePage({ project }: Props) {
  const score = project.virality?.overallScore ?? null
  const defaultMode = project.virality?.regions.find(r => r.name === 'Default Mode')?.score ?? null

  return (
    <>
      <div className="validate-header">
        {project.emoji} Virality Validation
      </div>
      <div className="validate-sub">
        Higgsfield Brain Activity Score — <code className="inline-code">brandly_validate</code>
      </div>

      <div className={`card ${score !== null ? 'accent-border' : ''}`}>
        <div className="card-header">
          <span className="card-title">Brain Activity Score</span>
          {score !== null
            ? <span className={`badge ${score >= 70 ? 'badge-green' : score >= 50 ? 'badge-amber' : 'badge-red'}`}>
                {score >= 70 ? '✓ Ready' : score >= 50 ? '⚡ Fix' : '✕ Re-edit'}
              </span>
            : <span className="badge badge-gray">Not yet run</span>
          }
        </div>

        {project.virality
          ? <ViralityMeter data={project.virality} />
          : (
            <div className="empty-virality">
              <div className="empty-virality-icon">🧠</div>
              <div className="empty-virality-title">No virality data yet</div>
              <div className="empty-virality-body">
                After rendering your final video, run <br />
                <code className="inline-code">brandly_validate(projectID="{project.id}", videoPath="./output.mp4")</code>
              </div>
            </div>
          )
        }
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Score Thresholds</span></div>
        <div className="thresholds-list">
          {THRESHOLDS.map(t => {
            const isActive =
              (t.range === '> 70'    && score !== null && score >= 70) ||
              (t.range === '50–70'   && score !== null && score >= 50 && score < 70) ||
              (t.range === '< 50'    && score !== null && score < 50) ||
              (t.range === 'DM > 60' && defaultMode !== null && defaultMode > 60)

            return (
              <div key={t.range} className={`threshold-row ${isActive ? 'active' : ''}`} style={{ '--th-color': t.color } as any}>
                <span className="threshold-icon">{t.icon}</span>
                <div className="threshold-body">
                  <div className="threshold-label">{t.label}</div>
                  <div className="threshold-range">Score {t.range}</div>
                </div>
                {isActive && <span className="threshold-current">← Current</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">CLI Reference</span></div>
        <pre className="cli-block">
{`# Validate finished video with Higgsfield
higgsfield generate create brain_activity \\
  --video ./finished-video.mp4 \\
  --wait

# Then record results in Brandly
brandly_validate(
  projectID="${project.id}",
  videoPath="./finished-video.mp4"
)`}
        </pre>
        {score !== null && score < 70 && (
          <div className="re-edit-panel">
            <div className="re-edit-title">⚡ Re-edit Recommendation</div>
            <div className="re-edit-body">
              Score is below threshold. Use <code className="inline-code">brandly_re_edit</code> to reshoot low-scoring shots, then re-render and re-validate.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
