import { useState, useEffect } from 'react'
import PipelineBar from '../components/PipelineBar'
import ViralityMeter from '../components/ViralityMeter'
import { statusBadge } from '../utils/statusBadge'
import { getHistory, getCosts } from '../api/client'
import type { Project } from '../types'
import type { HistoryEntry, CostEntry } from '../api/client'

interface Props {
  project: Project
  onRefresh: () => void
}

export default function OverviewPage({ project }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [costs, setCosts] = useState<CostEntry[]>([])

  useEffect(() => {
    getHistory(project.id).then(setHistory).catch(() => {})
    getCosts(project.id).then(setCosts).catch(() => {})
  }, [project.id])

  const completedPhases = project.phases.filter(p => p.status === 'completed').length
  const totalPhases = project.phases.length
  const pctDone = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0

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
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Current: <strong style={{ color: 'var(--text-primary)' }}>{project.currentPhase}</strong>
          </span>
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
            <span className="card-title">Cost Summary</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{costs.length} entries</span>
          </div>
          {costs.length === 0 ? (
            <div className="empty-virality">No costs recorded yet.</div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {costs.slice(-5).reverse().map((c, i) => (
                <div key={i} className="log-entry">
                  <span className="log-icon">💰</span>
                  <div className="log-body">
                    <div className="log-msg">{c.amount} credits — {c.description}</div>
                    <div className="log-time">{c.phase} · {new Date(c.ts).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">History Log</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{history.length} events</span>
        </div>
        {history.length === 0 ? (
          <div className="empty-virality">No history yet.</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {history.slice().reverse().map((e, i) => (
              <div key={i} className="log-entry">
                <span className="log-icon">{e.icon}</span>
                <div className="log-body">
                  <div className="log-msg">{e.msg}</div>
                  <div className="log-time">{new Date(e.ts).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
