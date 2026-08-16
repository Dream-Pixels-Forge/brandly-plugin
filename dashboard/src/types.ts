export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Phase {
  name: string
  label: string
  icon: string
  status: PhaseStatus
}

export interface BrainRegion {
  name: string
  score: number
  color: string
}

export interface ViralityData {
  overallScore: number
  peakHookSecond: number
  sustain: number
  regions: BrainRegion[]
}

export interface Project {
  id: string
  name: string
  product: string
  emoji: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentPhase: string
  budget: number
  spent: number
  phases: Phase[]
  virality?: ViralityData
  provider: string
  platform: string[]
  createdAt: string
  description?: string
  style?: string
}
