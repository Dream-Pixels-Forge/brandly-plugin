import { useState } from 'react'
import { statusBadge } from '../utils/statusBadge'
import { createProject, deleteProject } from '../api/client'
import type { Project } from '../types'
import type { CreateProjectInput } from '../api/client'

interface Props {
  projects: Project[]
  selected: Project | null
  onSelect: (p: Project) => void
  onCreated: (p: Project) => void
  onRefresh: () => void
}

const STYLES = [
  'cinematic', 'ugc', 'montage', 'multi_shot', 'continuous',
  'unboxing', 'lifestyle', 'collage_motion_graphic', 'brand_short_video', 'explainer_video',
]

export default function ProjectsPage({ projects, selected, onSelect, onCreated, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateProjectInput>({
    name: '',
    description: '',
    style: 'cinematic',
    budget: 500,
    targetPlatforms: ['tiktok', 'instagram'],
  })
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const project = await createProject(form)
      onCreated({
        ...project,
        product: project.name,
        status: project.status as Project['status'],
        emoji: '📁',
        phases: [],
      })
      setShowCreate(false)
      setForm({ name: '', description: '', style: 'cinematic', budget: 500, targetPlatforms: ['tiktok', 'instagram'] })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project permanently?')) return
    setDeleting(id)
    try {
      await deleteProject(id)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">All Projects ({projects.length})</div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ New Project</button>
      </div>

      {showCreate && (
        <div className="card accent-border" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">New Project</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Glow Energy Drink"
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product idea, key features, selling points…"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Style</label>
                <select style={inputStyle} value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                  {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Budget (credits)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={labelStyle}>Platforms</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['tiktok', 'instagram', 'youtube'].map((p) => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.targetPlatforms?.includes(p)}
                        onChange={(e) => {
                          const platforms = form.targetPlatforms || []
                          setForm({
                            ...form,
                            targetPlatforms: e.target.checked ? [...platforms, p] : platforms.filter((x) => x !== p),
                          })
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.name.trim()}>
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="projects-list">
        {projects.length === 0 && (
          <div className="empty-virality">No projects yet. Click "New Project" to get started.</div>
        )}
        {projects.map(p => (
          <button
            key={p.id}
            className={`project-item ${selected?.id === p.id ? 'selected' : ''}`}
            onClick={() => onSelect(p)}
          >
            <div className="project-thumb">{p.emoji}</div>
            <div className="project-info">
              <div className="project-name">{p.name}</div>
              <div className="project-meta">{p.provider} · {p.currentPhase} · {p.style || 'cinematic'}</div>
            </div>
            <div className="project-right">
              {statusBadge(p.status)}
              <div className="project-budget-row">
                <div className="budget-bar-bg">
                  <div className="budget-bar-fill" style={{ width: `${p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0}%` }} />
                </div>
                <span className="project-score">{p.spent}/{p.budget}</span>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
              disabled={deleting === p.id}
              title="Delete project"
            >
              🗑
            </button>
          </button>
        ))}
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
}
