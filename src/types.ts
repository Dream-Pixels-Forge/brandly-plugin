// --- Enums ---
export type InputType = "idea" | "image" | "video" | "idea_with_image";

export type VideoStyle =
  | "cinematic"
  | "ugc"
  | "montage"
  | "multi_shot"
  | "continuous"
  | "unboxing"
  | "lifestyle";

export type Platform = "tiktok" | "instagram" | "youtube" | "all";

// --- Pipeline Phases (C4 fix: aligned with phaseOrder in index.ts) ---
export type Phase =
  | "init"
  | "trends"
  | "concept"
  | "script"
  | "asset"
  | "audio"
  | "validate"
  | "publish"
  | "done"
  | "re_edit"
  | "failed";

// --- Shot ---
export interface Shot {
  id: number;
  duration: number; // Seconds
  description: string;
  cameraMovement?: string;
  lighting?: string;
  style?: string;
  subject?: string;
  environment?: string;
  prompt?: string; // Generated prompt for this shot
  renderPath?: string; // Path to rendered video file
  qualityScore?: number; // 0-10 quality score
  model?: string; // Which model generated this
  negativePrompt?: string;
  estimatedCredits?: number;
}

// --- Project State ---
export interface ProjectState {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Input
  inputType: InputType;
  idea?: string;
  imagePath?: string;
  videoPath?: string;
  imageAnalysis?: any; // Image analyzer output JSON
  imageAnalysisPending?: boolean;

  // Config
  productName: string;
  targetPlatforms: Platform[];
  style?: VideoStyle;
  budgetCredits: number;
  creditsSpent: number;

  // Pipeline state (C4 fix: audio added, preview removed)
  currentPhase: Phase;
  viralityScore?: number;

  // Artifacts
  viralityReport?: string; // Path to virality report
  storyboardPath?: string;
  shots: Shot[];
  finalCutPath?: string;
  publishPaths: Record<string, string>;

  // Preview mode
  previewMode: boolean; // Generate low-res previews first
  previewPaths: Record<string, string>; // Preview renders per shot
  previewApproved: boolean;

  // Re-edit state
  reEditTarget?: number; // Shot ID being re-edited
  reEditHistory: {
    shotId: number;
    timestamp: string;
    reason: string;
    creditsSpent: number;
  }[];

  // User preferences (learned across projects)
  userPreferences: {
    preferredStyle?: VideoStyle;
    preferredModel?: string;
    preferredDuration?: number;
    likedHooks: string[];
    dislikedHooks: string[];
    avgBudgetUsage?: number;
  };

  // Audio
  audioTrack: {
    path?: string;
    style?: string;
    source: "generated" | "suggested" | "none";
  };

  // Cost log
  costLog: {
    phase: string;
    action: string;
    credits: number;
    timestamp: string;
  }[];

  // Upfront estimate
  costEstimate?: {
    concept: number;
    script: number;
    asset: number;
    audio: number;
    validate: number;
    publish: number;
    total: number;
  };

  // Artifact paths (H7 fix: plugin writes artifacts, not subagents)
  artifactPaths?: {
    analysis: string;
    trends: string;
    concept: string;
    script: string;
    storyboard: string;
    assetPlan: string;
    audioPlan: string;
  };

  // Generated file directories (outside .brandly — for binary files)
  genDirs?: {
    imagen: string;
    videgen: string;
    audgen: string;
  };
}
