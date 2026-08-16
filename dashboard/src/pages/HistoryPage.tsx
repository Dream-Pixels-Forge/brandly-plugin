import { useState, useEffect } from 'react'
import { getHistory } from '../api/client'
import type { Project } from '../types'
import type { HistoryEntry } from '../api/client'

interface Props {
  project: Project
}

export default function HistoryPage({ project }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getHistory(project.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [project.id])

  return (
    <>
      <div className="page-header">
        <div className="page-title">📋 History — {project.name}</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{history.length} events</span>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-virality">Loading…</div>
        ) : history.length === 0 ? (
          <div className="empty-virality">
            <div className="empty-virality-icon">📋</div>
            <div className="empty-virality-title">No history yet</div>
            <div className="empty-virality-body">
              Events will appear here as the project progresses through phases.
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
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
