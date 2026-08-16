import { statusBadge } from '../utils/statusBadge'
import type { Project } from '../types'

interface Props {
  projects: Project[]
  selected: Project | null
  onSelect: (p: Project) => void
}

export default function ProjectsPage({ projects, selected, onSelect }: Props) {
  return (
    <>
      <div className="page-header">
        <div className="page-title">All Projects</div>
        <button className="btn btn-primary">＋ New Project</button>
      </div>
      <div className="projects-list">
        {projects.map(p => (
          <button
            key={p.id}
            className={`project-item ${selected?.id === p.id ? 'selected' : ''}`}
            onClick={() => onSelect(p)}
          >
            <div className="project-thumb">{p.emoji}</div>
            <div className="project-info">
              <div className="project-name">{p.name}</div>
              <div className="project-meta">{p.provider} · {p.currentPhase}</div>
            </div>
            <div className="project-right">
              {statusBadge(p.status)}
              <div className="project-budget-row">
                <div className="budget-bar-bg">
                  <div className="budget-bar-fill" style={{ width: `${Math.round((p.spent / p.budget) * 100)}%` }} />
                </div>
                <span className="project-score">{p.virality?.overallScore ?? '—'}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
