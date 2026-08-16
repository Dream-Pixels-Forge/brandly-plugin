import { useState } from 'react'
import type { Project } from '../types'
import { runPhase, approvePhase, cancelProject, reEditFromPhase } from '../api/client'

interface Props {
  project: Project
  onRefresh: () => void
}

export default function TopBar({ project, onRefresh }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const remaining = project.budget - project.spent
  const pct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0
  const budgetColor = remaining < 50 ? 'var(--phase-failed)' : remaining < 150 ? 'var(--phase-running)' : 'var(--accent)'

  const currentPhase = project.phases.find((p) => p.name === project.currentPhase)
  const isRunning = currentPhase?.status === 'running'
  const isPending = currentPhase?.status === 'pending'
  const isCompleted = project.status === 'completed'
  const isCancelled = project.status === 'cancelled'

  const handleRun = async () => {
    setActionLoading('run')
    try {
      await runPhase(project.id)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await approvePhase(project.id)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this project?')) return
    setActionLoading('cancel')
    try {
      await cancelProject(project.id)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReEdit = async () => {
    setActionLoading('re_edit')
    try {
      await reEditFromPhase(project.id, project.currentPhase)
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 24 }}>{project.emoji}</div>
        <div>
          <div className="topbar-title">{project.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {project.provider} · {project.platform.join(', ')} · ID: {project.id.slice(0, 12)}…
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

        <div style={{ display: 'flex', gap: 8 }}>
          {isPending && (
            <button className="btn btn-primary" onClick={handleRun} disabled={!!actionLoading}>
              {actionLoading === 'run' ? '…' : '▶ Run Phase'}
            </button>
          )}
          {isRunning && (
            <>
              <button className="btn btn-primary" onClick={handleApprove} disabled={!!actionLoading}>
                {actionLoading === 'approve' ? '…' : '✓ Approve'}
              </button>
              <button className="btn btn-ghost" onClick={handleReEdit} disabled={!!actionLoading}>
                {actionLoading === 're_edit' ? '…' : '✂ Re-edit'}
              </button>
            </>
          )}
          {!isCompleted && !isCancelled && (
            <button className="btn btn-ghost" onClick={handleCancel} disabled={!!actionLoading} style={{ color: 'var(--phase-failed)' }}>
              {actionLoading === 'cancel' ? '…' : '⛔ Cancel'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
