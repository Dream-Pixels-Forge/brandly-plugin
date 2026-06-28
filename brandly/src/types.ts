import { z } from "zod";

// --- Enums ---
export const InputType = z.enum(["idea", "image", "video", "idea_with_image"]);
export type InputType = z.infer<typeof InputType>;

export const VideoStyle = z.enum([
  "cinematic",
  "ugc",
  "montage",
  "multi_shot",
  "continuous",
  "unboxing",
  "lifestyle",
]);
export type VideoStyle = z.infer<typeof VideoStyle>;

export const Platform = z.enum(["tiktok", "instagram", "youtube", "all"]);
export type Platform = z.infer<typeof Platform>;

// --- Pipeline Phases (C4 fix: aligned with phaseOrder in index.ts) ---
export const Phase = z.enum([
  "init",
  "trends",
  "concept",
  "script",
  "asset",
  "audio",
  "validate",
  "publish",
  "done",
  "re_edit",
  "failed",
]);
export type Phase = z.infer<typeof Phase>;

// --- Shot ---
export const ShotSchema = z.object({
  id: z.number(),
  duration: z.number().describe("Seconds"),
  description: z.string(),
  cameraMovement: z.string().optional(),
  lighting: z.string().optional(),
  style: z.string().optional(),
  subject: z.string().optional(),
  environment: z.string().optional(),
  prompt: z.string().optional().describe("Generated prompt for this shot"),
  renderPath: z.string().optional().describe("Path to rendered video file"),
  qualityScore: z.number().optional().describe("0-10 quality score"),
  model: z.string().optional().describe("Which model generated this"),
  negativePrompt: z.string().optional(),
  estimatedCredits: z.number().optional(),
});
export type Shot = z.infer<typeof ShotSchema>;

// --- Project State ---
export const ProjectState = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Input
  inputType: InputType,
  idea: z.string().optional(),
  imagePath: z.string().optional(),
  videoPath: z.string().optional(),
  imageAnalysis: z.any().optional().describe("Image analyzer output JSON"),

  // Config
  productName: z.string(),
  targetPlatforms: z.array(Platform),
  style: VideoStyle.optional(),
  budgetCredits: z.number().positive(),
  creditsSpent: z.number().default(0),

  // Pipeline state (C4 fix: audio added, preview removed)
  currentPhase: Phase,
  viralityScore: z.number().min(0).max(10).optional(),

  // Artifacts
  viralityReport: z.string().optional().describe("Path to virality report"),
  storyboardPath: z.string().optional(),
  shots: z.array(ShotSchema).default([]),
  finalCutPath: z.string().optional(),
  publishPaths: z.record(z.string()).default({}),

  // Preview mode
  previewMode: z.boolean().default(true).describe("Generate low-res previews first"),
  previewPaths: z.record(z.string()).default({}).describe("Preview renders per shot"),
  previewApproved: z.boolean().default(false),

  // Re-edit state
  reEditTarget: z.number().optional().describe("Shot ID being re-edited"),
  reEditHistory: z
    .array(
      z.object({
        shotId: z.number(),
        timestamp: z.string().datetime(),
        reason: z.string(),
        creditsSpent: z.number(),
      })
    )
    .default([]),

  // User preferences (learned across projects)
  userPreferences: z
    .object({
      preferredStyle: VideoStyle.optional(),
      preferredModel: z.string().optional(),
      preferredDuration: z.number().optional(),
      likedHooks: z.array(z.string()).default([]),
      dislikedHooks: z.array(z.string()).default([]),
      avgBudgetUsage: z.number().optional(),
    })
    .default({}),

  // Audio
  audioTrack: z
    .object({
      path: z.string().optional(),
      style: z.string().optional(),
      source: z.enum(["generated", "suggested", "none"]).default("none"),
    })
    .default({ source: "none" }),

  // Cost log
  costLog: z
    .array(
      z.object({
        phase: z.string(),
        action: z.string(),
        credits: z.number(),
        timestamp: z.string().datetime(),
      })
    )
    .default([]),

  // Upfront estimate
  costEstimate: z
    .object({
      concept: z.number(),
      script: z.number(),
      asset: z.number(),
      audio: z.number(),
      validate: z.number(),
      publish: z.number(),
      total: z.number(),
    })
    .optional(),

  // Artifact paths (H7 fix: plugin writes artifacts, not subagents)
  artifactPaths: z
    .object({
      analysis: z.string(),
      trends: z.string(),
      concept: z.string(),
      script: z.string(),
      storyboard: z.string(),
      assetPlan: z.string(),
      audioPlan: z.string(),
    })
    .optional(),

  // Generated file directories (outside .brandly — for binary files)
  genDirs: z
    .object({
      imagen: z.string(),
      videgen: z.string(),
      audgen: z.string(),
    })
    .optional(),
});
export type ProjectState = z.infer<typeof ProjectState>;