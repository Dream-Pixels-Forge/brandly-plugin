import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import OverviewPage from './pages/OverviewPage'
import ProjectsPage from './pages/ProjectsPage'
import ValidatePage from './pages/ValidatePage'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'
import { listProjects, getProject, getProgress } from './api/client'
import type { Project } from './types'

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

function AppInner() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listProjects()
      .then(async (summaries) => {
        if (cancelled) return
        const detailed = await Promise.all(
          summaries.map(async (s) => {
            try {
              const [detail, progress] = await Promise.all([
                getProject(s.id),
                getProgress(s.id),
              ])
              return mapApiToProject(detail, progress)
            } catch {
              return mapSummaryToProject(s)
            }
          })
        )
        if (!cancelled) {
          setProjects(detailed)
          if (detailed.length > 0 && !selectedProject) {
            setSelectedProject(detailed[0])
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const handleSelectProject = (project: Project) => {
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
        {selectedProject && <TopBar project={selectedProject} />}
        <div className="content fade-in">
          <ErrorBoundary>
            {loading ? (
              <LoadingSpinner />
            ) : selectedProject ? (
              <Routes>
                <Route path="/" element={<OverviewPage project={selectedProject} />} />
                <Route path="/projects" element={<ProjectsPage projects={projects} selected={selectedProject} onSelect={handleSelectProject} />} />
                <Route path="/validate" element={<ValidatePage project={selectedProject} />} />
              </Routes>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No projects found.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

function mapApiToProject(detail: any, progress: any): Project {
  const phases: Project['phases'] = []
  const phaseNames = ['init', 'trends', 'concept', 'script', 'asset', 'audio', 're_edit', 'validate', 'publish', 'done']
  for (const name of phaseNames) {
    const status = detail.phases?.[name]?.status || progress.phases?.[name] || 'pending'
    phases.push({ name, label: name, icon: phaseIcon(name), status: status as any })
  }
  const currentPhase = detail.currentPhase || progress.currentPhase || 'init'
  const status = detail.status || progress.projectStatus || 'pending'
  return {
    id: detail.projectId || detail.id,
    name: detail.name || 'Untitled Project',
    product: detail.name || 'Untitled Project',
    emoji: projectEmoji(status),
    status: status as any,
    currentPhase,
    budget: detail.budget || 0,
    spent: detail.spent || 0,
    phases,
    provider: detail.provider || 'Brandly',
    platform: detail.targetPlatforms || [],
    createdAt: detail.createdAt || new Date().toISOString(),
  }
}

function mapSummaryToProject(s: any): Project {
  return {
    id: s.id,
    name: s.name,
    product: s.name,
    emoji: projectEmoji(s.status),
    status: s.status as any,
    currentPhase: s.currentPhase,
    budget: s.budget,
    spent: s.spent,
    phases: [],
    provider: s.provider || 'Brandly',
    platform: s.platform || [],
    createdAt: s.createdAt,
  }
}

function phaseIcon(name: string): string {
  const map: Record<string, string> = {
    init: '🎬', trends: '📈', concept: '💡', script: '📝',
    asset: '🎥', audio: '🎵', re_edit: '✂️', validate: '✅', publish: '🚀', done: '🏁',
  }
  return map[name] || '•'
}

function projectEmoji(status: string): string {
  if (status === 'running') return '⚡'
  if (status === 'completed') return '✨'
  if (status === 'failed') return '❌'
  return '📁'
}
