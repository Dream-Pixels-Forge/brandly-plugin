import type { VideoStyle } from "./constants";

export interface BrandlyPluginConfig {
  defaultBudget?: number;
  maxBudget?: number;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolContext {
  directory: string;
  projectsDir: string;
  imagesDir: string;
  artifactsDir: string;
  agentsDir: string;
  writeAtomic: (path: string, content: string) => Promise<void>;
  writeProject: (id: string, data: ProjectData) => Promise<void>;
  readProject: (id: string) => Promise<ProjectData | null>;
  listProjects: () => Promise<string[]>;
  isPathAllowed: (filePath: string) => boolean;
  getArtifactPaths: (projectDir: string, phase: string) => string[];
  getPhaseCostEstimate: (
    style: string,
    shotCount: number,
    currentPhase: string,
    targetPhase: string
  ) => number;
}

export interface ProjectData {
  id: string;
  name?: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";
  style: VideoStyle;
  shotCount: number;
  budget: number;
  spent: number;
  currentPhase: string;
  phases: Record<string, PhaseResult>;
  hooks?: string[];
  settings?: string[];
  targetPlatforms?: string[];
  imageAnalysis?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseResult {
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface TrendReport {
  summary: string;
  patterns: string[];
  recommendations: string[];
  timestamp: string;
}

export interface ConceptData {
  title: string;
  description: string;
  visualStyle: string;
  narrative: string;
  characters?: string[];
  setting?: string;
}

export interface ScriptData {
  scenes: ScriptScene[];
  duration: number;
  tone: string;
  pacing: string;
}

export interface ScriptScene {
  id: number;
  description: string;
  duration: number;
  dialogue?: string;
  visualNotes?: string;
}

export interface AssetPlan {
  assets: AssetItem[];
  style: string;
  mood: string;
}

export interface AssetItem {
  id: string;
  type: "image" | "video" | "audio" | "3d";
  description: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
}

export interface AudioPlan {
  tracks: AudioTrack[];
  style: string;
  mood: string;
}

export interface AudioTrack {
  id: string;
  type: "music" | "sfx" | "voiceover";
  description: string;
  prompt: string;
  duration?: number;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface CostEstimate {
  style: VideoStyle;
  shotCount: number;
  baseCost: number;
  shotCost: number;
  totalCost: number;
}
