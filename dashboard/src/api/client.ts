export interface ProjectSummary {
  id: string
  name: string
  status: string
  currentPhase: string
  budget: number
  spent: number
  provider: string
  platform: string[]
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
  phases: Record<string, { status: string; startedAt?: string; completedAt?: string }>
  targetPlatforms: string[]
}

export interface ProjectProgress {
  projectId: string
  projectStatus: string
  currentPhase: string
  overallPercent: number
  completedPhases: number
  totalPhases: number
  phases: Record<string, string>
  timeInCurrentPhase: string | null
  estimatedRemaining: string | null
  status: string
}

const API_BASE = '/api'

async function handleJson(res: Response) {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE}/projects`)
  return handleJson(res)
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}`)
  return handleJson(res)
}

export async function getProgress(id: string): Promise<ProjectProgress> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/progress`)
  return handleJson(res)
}
