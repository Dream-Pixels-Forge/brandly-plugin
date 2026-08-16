import type { Project } from '../types'

interface Props { project: Project }

export default function TopBar({ project }: Props) {
  const remaining = project.budget - project.spent
  const pct = Math.round((project.spent / project.budget) * 100)
  const budgetColor = remaining < 50 ? 'var(--phase-failed)' : remaining < 150 ? 'var(--phase-running)' : 'var(--accent)'

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 24 }}>{project.emoji}</div>
        <div>
          <div className="topbar-title">{project.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {project.provider} · {project.platform.join(', ')} · ID: {project.id}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Budget: <span style={{ color: budgetColor, fontWeight: 700 }}>{remaining}</span> / {project.budget} credits ({pct}% spent)
          </div>
          <div className="budget-bar-bg" style={{ width: 160 }}>
            <div className="budget-bar-fill" style={{ width: `${pct}%`, background: budgetColor }} />
          </div>
        </div>
        <button className="btn btn-primary">▶ Run Phase</button>
      </div>
    </header>
  )
}
