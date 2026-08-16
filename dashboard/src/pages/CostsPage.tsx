import { useState, useEffect } from 'react'
import { getCosts, recordCost } from '../api/client'
import type { Project } from '../types'
import type { CostEntry } from '../api/client'

interface Props {
  project: Project
  onRefresh: () => void
}

export default function CostsPage({ project, onRefresh }: Props) {
  const [costs, setCosts] = useState<CostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ amount: 0, description: '', phase: project.currentPhase })
  const [submitting, setSubmitting] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await getCosts(project.id)
      setCosts(data)
    } catch {
      setCosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [project.id])
  useEffect(() => { setForm((f) => ({ ...f, phase: project.currentPhase })) }, [project.currentPhase])

  const totalSpent = costs.reduce((sum, c) => sum + c.amount, 0)
  const remaining = project.budget - totalSpent

  const handleAdd = async () => {
    if (form.amount <= 0 || !form.description.trim()) return
    setSubmitting(true)
    try {
      await recordCost(project.id, form.amount, form.description, form.phase)
      await refresh()
      onRefresh()
      setShowAdd(false)
      setForm({ amount: 0, description: '', phase: project.currentPhase })
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const byPhase = costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.phase] = (acc[c.phase] || 0) + c.amount
    return acc
  }, {})

  return (
    <>
      <div className="page-header">
        <div className="page-title">💰 Cost Tracking — {project.name}</div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Record Cost</button>
      </div>

      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value stat-amber">{totalSpent}</div>
          <div className="stat-sub">credits</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining</div>
          <div className={`stat-value ${remaining < 50 ? 'stat-red' : 'stat-green'}`}>{remaining}</div>
          <div className="stat-sub">of {project.budget} budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{costs.length}</div>
          <div className="stat-sub">cost entries</div>
        </div>
      </div>

      {showAdd && (
        <div className="card accent-border">
          <div className="card-header">
            <span className="card-title">Record Cost</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount (credits)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  style={inputStyle}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Kling AI video generation"
                />
              </div>
              <div>
                <label style={labelStyle}>Phase</label>
                <select style={inputStyle} value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
                  {['init', 'trends', 'concept', 'script', 'asset', 'audio', 're_edit', 'validate', 'publish'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting || form.amount <= 0 || !form.description.trim()}>
                {submitting ? 'Recording…' : 'Record Cost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(byPhase).length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Cost by Phase</span></div>
          {Object.entries(byPhase).sort((a, b) => b[1] - a[1]).map(([phase, amount]) => (
            <div key={phase} className="log-entry">
              <span className="log-icon">📊</span>
              <div className="log-body">
                <div className="log-msg">{phase}</div>
                <div style={{ marginTop: 4 }}>
                  <div className="budget-bar-bg">
                    <div className="budget-bar-fill" style={{ width: `${Math.round((amount / totalSpent) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--phase-running)' }}>{amount} credits</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">All Transactions</span></div>
        {loading ? (
          <div className="empty-virality">Loading…</div>
        ) : costs.length === 0 ? (
          <div className="empty-virality">No costs recorded yet.</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {costs.slice().reverse().map((c, i) => (
              <div key={i} className="log-entry">
                <span className="log-icon">💰</span>
                <div className="log-body">
                  <div className="log-msg">{c.description}</div>
                  <div className="log-time">{c.phase} · {new Date(c.ts).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--phase-running)' }}>{c.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13,
  fontFamily: 'var(--font-sans)', outline: 'none',
}
