import type { Project } from '../types'
import { useNavigate } from 'react-router-dom'
import { statusBadge } from '../utils/statusBadge'

interface Props {
  projects: Project[]
  selectedProject: Project | null
  onSelectProject: (p: Project) => void
}

export default function Sidebar({ projects, selectedProject, onSelectProject }: Props) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">🎬</div>
        <div>
          <div className="logo-text">Brandly</div>
          <div className="logo-sub">Director</div>
        </div>
      </div>

      <div className="nav-section-label">Navigation</div>
      <NavButton to="/" icon="◈" label="Overview" current="/" />
      <NavButton to="/projects" icon="▤" label="Projects" current="/projects" />
      <NavButton to="/validate" icon="◎" label="Validate" current="/validate" />

      <div className="nav-section-label" style={{ marginTop: 16 }}>Projects</div>
      {projects.map(p => (
        <button
          key={p.id}
          className={`nav-item ${selectedProject?.id === p.id ? 'active' : ''}`}
          onClick={() => onSelectProject(p)}
          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <span>{p.emoji}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            {statusBadge(p.status)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 20 }}>{p.currentPhase} • {p.provider}</div>
        </button>
      ))}
    </aside>
  )
}

function NavButton({ to, icon, label, current }: { to: string; icon: string; label: string; current: string }) {
  const navigate = useNavigate()
  const active = current === to || (current === '/' && to === '/')
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={() => navigate(to)}
    >
      <span className="nav-icon">{icon}</span>
      {label}
    </button>
  )
}
