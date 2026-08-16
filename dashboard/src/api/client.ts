const API_BASE = '/api'

async function handleJson(res: Response) {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

// --- Types ---

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
  description: string
  style: string
  shotCount: number
  imageAnalysis: Record<string, unknown> | null
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

export interface Artifact {
  name: string
  size: number
  ts: string
}

export interface CostEntry {
  phase: string
  amount: number
  description: string
  ts: string
}

export interface HistoryEntry {
  icon: string
  msg: string
  ts: string
}

export interface GlobalStats {
  totalProjects: number
  running: number
  completed: number
  totalSpent: number
  totalBudget: number
}

export interface CreateProjectInput {
  name: string
  description?: string
  style?: string
  shotCount?: number
  budget?: number
  targetPlatforms?: string[]
  provider?: string
}

// --- Queries ---

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

export async function getArtifacts(id: string): Promise<Artifact[]> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/artifacts`)
  return handleJson(res)
}

export async function getCosts(id: string): Promise<CostEntry[]> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/costs`)
  return handleJson(res)
}

export async function getHistory(id: string): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/history`)
  return handleJson(res)
}

export async function getStats(): Promise<GlobalStats> {
  const res = await fetch(`${API_BASE}/stats`)
  return handleJson(res)
}

// --- Mutations ---

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleJson(res)
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function runPhase(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/run`, { method: 'POST' })
  return handleJson(res)
}

export async function approvePhase(id: string, phase?: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase }),
  })
  return handleJson(res)
}

export async function cancelProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
  return handleJson(res)
}

export async function reEditFromPhase(id: string, phase: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/re_edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase }),
  })
  return handleJson(res)
}

export async function recordCost(id: string, amount: number, description: string, phase?: string): Promise<{ ok: boolean; spent: number }> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/costs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description, phase }),
  })
  return handleJson(res)
}

export async function exportProject(id: string, format = 'mp4', resolution = '1080x1920'): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, resolution }),
  })
  return handleJson(res)
}

export async function uploadArtifact(id: string, file: File): Promise<{ ok: boolean; name: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/artifacts`, {
    method: 'POST',
    body: form,
  })
  return handleJson(res)
}

// --- SSE Hook ---

export type SSEEvent = {
  type: 'connected' | 'project.created' | 'project.updated' | 'project.deleted' | 'artifact.uploaded' | 'cost.recorded' | 'export.started'
  data: any
}

export function subscribeEvents(onEvent: (event: SSEEvent) => void): () => void {
  const es = new EventSource(`${API_BASE}/events`)

  const handler = (e: MessageEvent) => {
    onEvent({ type: e.type as any, data: JSON.parse(e.data) })
  }

  es.addEventListener('connected', handler)
  es.addEventListener('project.created', handler)
  es.addEventListener('project.updated', handler)
  es.addEventListener('project.deleted', handler)
  es.addEventListener('artifact.uploaded', handler)
  es.addEventListener('cost.recorded', handler)
  es.addEventListener('export.started', handler)

  return () => es.close()
}
