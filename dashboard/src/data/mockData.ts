import type { Project } from '../types'

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'prj-001',
    name: 'Glow Energy Drink',
    product: 'Glow Energy',
    emoji: '⚡',
    status: 'running',
    currentPhase: 'asset',
    budget: 500,
    spent: 185,
    provider: 'Higgsfield AI',
    platform: ['tiktok', 'instagram'],
    createdAt: '2026-07-12T09:14:00Z',
    phases: [
      { name: 'init',     label: 'Init',     icon: '🎬', status: 'completed' },
      { name: 'trends',   label: 'Trends',   icon: '📈', status: 'completed' },
      { name: 'concept',  label: 'Concept',  icon: '💡', status: 'completed' },
      { name: 'script',   label: 'Script',   icon: '📝', status: 'completed' },
      { name: 'asset',    label: 'Asset',    icon: '🎥', status: 'running'   },
      { name: 'audio',    label: 'Audio',    icon: '🎵', status: 'pending'   },
      { name: 'validate', label: 'Validate', icon: '✅', status: 'pending'   },
      { name: 'publish',  label: 'Publish',  icon: '🚀', status: 'pending'   },
    ],
    virality: {
      overallScore: 72,
      peakHookSecond: 2,
      sustain: 84,
      regions: [
        { name: 'Visual Cortex',  score: 78, color: '#10b981' },
        { name: 'Auditory',       score: 61, color: '#6366f1' },
        { name: 'Language',       score: 45, color: '#f59e0b' },
        { name: 'Attention',      score: 70, color: '#3b82f6' },
        { name: 'Default Mode',   score: 32, color: '#ef4444' },
      ]
    }
  },
  {
    id: 'prj-002',
    name: 'Luxe Perfume Launch',
    product: 'Élume Noir',
    emoji: '✨',
    status: 'completed',
    currentPhase: 'publish',
    budget: 300,
    spent: 298,
    provider: 'Runway ML',
    platform: ['instagram', 'youtube'],
    createdAt: '2026-07-10T14:22:00Z',
    phases: [
      { name: 'init',     label: 'Init',     icon: '🎬', status: 'completed' },
      { name: 'trends',   label: 'Trends',   icon: '📈', status: 'completed' },
      { name: 'concept',  label: 'Concept',  icon: '💡', status: 'completed' },
      { name: 'script',   label: 'Script',   icon: '📝', status: 'completed' },
      { name: 'asset',    label: 'Asset',    icon: '🎥', status: 'completed' },
      { name: 'audio',    label: 'Audio',    icon: '🎵', status: 'completed' },
      { name: 'validate', label: 'Validate', icon: '✅', status: 'completed' },
      { name: 'publish',  label: 'Publish',  icon: '🚀', status: 'completed' },
    ],
    virality: {
      overallScore: 88,
      peakHookSecond: 1,
      sustain: 91,
      regions: [
        { name: 'Visual Cortex',  score: 91, color: '#10b981' },
        { name: 'Auditory',       score: 74, color: '#6366f1' },
        { name: 'Language',       score: 52, color: '#f59e0b' },
        { name: 'Attention',      score: 85, color: '#3b82f6' },
        { name: 'Default Mode',   score: 22, color: '#ef4444' },
      ]
    }
  },
  {
    id: 'prj-003',
    name: 'Sneaker Drop Teaser',
    product: 'AirForm X1',
    emoji: '👟',
    status: 'pending',
    currentPhase: 'init',
    budget: 200,
    spent: 0,
    provider: 'Kling AI',
    platform: ['tiktok'],
    createdAt: '2026-07-13T08:00:00Z',
    phases: [
      { name: 'init',     label: 'Init',     icon: '🎬', status: 'pending' },
      { name: 'trends',   label: 'Trends',   icon: '📈', status: 'pending' },
      { name: 'concept',  label: 'Concept',  icon: '💡', status: 'pending' },
      { name: 'script',   label: 'Script',   icon: '📝', status: 'pending' },
      { name: 'asset',    label: 'Asset',    icon: '🎥', status: 'pending' },
      { name: 'audio',    label: 'Audio',    icon: '🎵', status: 'pending' },
      { name: 'validate', label: 'Validate', icon: '✅', status: 'pending' },
      { name: 'publish',  label: 'Publish',  icon: '🚀', status: 'pending' },
    ],
  }
]
