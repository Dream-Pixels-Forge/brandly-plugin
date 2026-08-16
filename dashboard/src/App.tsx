import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import OverviewPage from './pages/OverviewPage'
import ProjectsPage from './pages/ProjectsPage'
import ValidatePage from './pages/ValidatePage'
import ArtifactsPage from './pages/ArtifactsPage'
import CostsPage from './pages/CostsPage'
import HistoryPage from './pages/HistoryPage'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'
import { listProjects, getProject, getProgress, subscribeEvents } from './api/client'
import type { Project, Phase } from './types'

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

const PHASE_NAMES = ['init', 'trends', 'concept', 'script', 'asset', 'audio', 're_edit', 'validate', 'publish', 'done']
const PHASE_ICONS: Record<string, string> = {
  init: '🎬', trends: '📈', concept: '💡', script: '📝',
  asset: '🎥', audio: '🎵', re_edit: '✂️', validate: '✅', publish: '🚀', done: '🏁',
}

function mapApiToProject(detail: any, progress?: any): Project {
  const phases: Phase[] = PHASE_NAMES.map((name) => ({
    name,
    label: name.replace('_', ' '),
    icon: PHASE_ICONS[name] || '•',
    status: (detail.phases?.[name]?.status || progress?.phases?.[name] || 'pending') as Phase['status'],
  }))
  return {
    id: detail.projectId || detail.id,
    name: detail.name || 'Untitled Project',
    product: detail.name || 'Untitled Project',
    emoji: projectEmoji(detail.status || 'pending'),
    status: detail.status || 'pending',
    currentPhase: detail.currentPhase || progress?.currentPhase || 'init',
    budget: detail.budget || 0,
    spent: detail.spent || 0,
    phases,
    provider: detail.provider || 'Brandly',
    platform: detail.targetPlatforms || [],
    createdAt: detail.createdAt || new Date().toISOString(),
    description: detail.description || '',
    style: detail.style || 'cinematic',
  }
}

function projectEmoji(status: string): string {
  if (status === 'running') return '⚡'
  if (status === 'completed') return '✨'
  if (status === 'failed') return '❌'
  if (status === 'cancelled') return '⛔'
  return '📁'
}

function AppInner() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const refreshProject = useCallback(async (id: string) => {
    try {
      const [detail, progress] = await Promise.all([getProject(id), getProgress(id)])
      return mapApiToProject(detail, progress)
    } catch {
      return null
    }
  }, [])

  const refreshAll = useCallback(async () => {
    try {
      const summaries = await listProjects()
      const detailed = await Promise.all(
        summaries.map(async (s) => {
          const p = await refreshProject(s.id)
          return p || mapApiToProject(s)
        })
      )
      setProjects(detailed)
      if (!selectedProject && detailed.length > 0) {
        setSelectedProject(detailed[0])
      } else if (selectedProject) {
        const updated = detailed.find((p) => p.id === selectedProject.id)
        if (updated) setSelectedProject(updated)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedProject])

  // Initial load
  useEffect(() => {
    refreshAll()
  }, [])

  // SSE for real-time updates
  useEffect(() => {
    const unsub = subscribeEvents((event) => {
      if (event.type === 'project.updated' || event.type === 'project.created' || event.type === 'project.deleted' || event.type === 'cost.recorded' || event.type === 'artifact.uploaded') {
        refreshAll()
      }
    })
    return unsub
  }, [refreshAll])

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    navigate('/')
  }

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev])
    setSelectedProject(project)
    navigate('/')
  }

  if (error) {
    return (
      <div className="app">
        <div className="mesh-bg" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--phase-failed)', padding: 28 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Failed to load dashboard</div>
            <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setError(null); setLoading(true); refreshAll() }}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="mesh-bg" />
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
      />
      <div className="main">
        {selectedProject && <TopBar project={selectedProject} onRefresh={refreshAll} />}
        <div className="content fade-in">
          <ErrorBoundary>
            {loading ? (
              <LoadingSpinner />
            ) : selectedProject ? (
              <Routes>
                <Route path="/" element={<OverviewPage project={selectedProject} onRefresh={refreshAll} />} />
                <Route path="/projects" element={<ProjectsPage projects={projects} selected={selectedProject} onSelect={handleSelectProject} onCreated={handleProjectCreated} onRefresh={refreshAll} />} />
                <Route path="/validate" element={<ValidatePage project={selectedProject} onRefresh={refreshAll} />} />
                <Route path="/artifacts" element={<ArtifactsPage project={selectedProject} onRefresh={refreshAll} />} />
                <Route path="/costs" element={<CostsPage project={selectedProject} onRefresh={refreshAll} />} />
                <Route path="/history" element={<HistoryPage project={selectedProject} />} />
              </Routes>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No projects yet</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first Brandly project to get started.</div>
                <button className="btn btn-primary" onClick={() => navigate('/projects')}>＋ New Project</button>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
