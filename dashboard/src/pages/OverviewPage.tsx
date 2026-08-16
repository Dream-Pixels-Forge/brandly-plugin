import PipelineBar from '../components/PipelineBar'
import ViralityMeter from '../components/ViralityMeter'
import { statusBadge } from '../utils/statusBadge'
import type { Project } from '../types'

interface Props { project: Project }

const HISTORY = [
  { icon: '✅', msg: 'Script phase approved — 6 shots defined.', time: '2m ago' },
  { icon: '🎥', msg: 'Asset phase dispatched → asset_agent running.', time: '5m ago' },
  { icon: '💡', msg: 'Concept approved — "Gravity Drop" selected.', time: '22m ago' },
  { icon: '📈', msg: 'Trends research complete — viral formats identified.', time: '1h ago' },
  { icon: '🎬', msg: 'Project created — budget: 500 credits.', time: '2h ago' },
]

export default function OverviewPage({ project }: Props) {
  const completedPhases = project.phases.filter(p => p.status === 'completed').length
  const totalPhases = project.phases.length
  const pctDone = Math.round((completedPhases / totalPhases) * 100)

  return (
    <>
      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div style={{ marginTop: 4 }}>{statusBadge(project.status)}</div>
          <div className="stat-sub">Phase {completedPhases}/{totalPhases} · {pctDone}% done</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budget</div>
          <div className="stat-value stat-green">{project.budget - project.spent}</div>
          <div className="stat-sub">credits remaining of {project.budget}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Virality Score</div>
          <div className={`stat-value ${(project.virality?.overallScore ?? 0) >= 70 ? 'stat-green' : 'stat-amber'}`}>
            {project.virality?.overallScore ?? '—'}
          </div>
          <div className="stat-sub">Higgsfield brain score</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Production Pipeline</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current: <strong style={{ color: 'var(--text-primary)' }}>{project.currentPhase}</strong></span>
        </div>
        <PipelineBar phases={project.phases} currentPhase={project.currentPhase} />
      </div>

      <div className="grid-2">
        <div className={`card ${project.virality ? 'accent-border' : ''}`}>
          <div className="card-header">
            <span className="card-title">Virality Predictor</span>
            {project.virality && <span className="badge badge-green">Scored</span>}
          </div>
          {project.virality
            ? <ViralityMeter data={project.virality} />
            : (
              <div className="empty-virality">
                Run <code className="inline-code">brandly_validate</code> after rendering to see brain scores.
              </div>
            )
          }
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Video Preview</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remotion Player</span>
          </div>
          <div className="preview-layout">
            <div className="preview-panel">
              <div className="preview-placeholder">
                <div className="icon">🎞</div>
                <div className="preview-text">
                  {project.status === 'running' ? 'Rendering…' : 'No preview yet'}
                </div>
              </div>
            </div>
            <div className="preview-meta">
              <div className="preview-meta-title">Composition</div>
              {[
                ['Format', '9:16 Vertical (1080×1920)'],
                ['Duration', '15s · 30fps'],
                ['Shots', '6 clips'],
                ['Audio', 'Track + SFX'],
                ['Provider', project.provider],
              ].map(([k, v]) => (
                <div key={k} className="preview-meta-row">
                  <span className="preview-meta-key">{k}</span>
                  <span className="preview-meta-val">{v}</span>
                </div>
              ))}
              <button className="btn btn-ghost preview-btn">▶ Open in Remotion</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">History Log</span>
          <button className="btn btn-ghost btn-sm">View Full Log</button>
        </div>
        {HISTORY.map((e, i) => (
          <div key={i} className="log-entry">
            <span className="log-icon">{e.icon}</span>
            <div className="log-body">
              <div className="log-msg">{e.msg}</div>
              <div className="log-time">{e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
