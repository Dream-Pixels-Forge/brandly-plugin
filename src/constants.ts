import { randomUUID } from "node:crypto";

export function generateProjectId(): string {
  return randomUUID();
}

export function isValidProjectId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export type VideoStyle = "cinematic" | "ugc" | "montage" | "multi_shot" | "continuous" | "unboxing" | "lifestyle" | "collage_motion_graphic" | "brand_short_video" | "explainer_video";

export const VIDEO_STYLES: VideoStyle[] = [
  "cinematic",
  "ugc",
  "montage",
  "multi_shot",
  "continuous",
  "unboxing",
  "lifestyle",
  "collage_motion_graphic",
  "brand_short_video",
  "explainer_video",
];

export const STYLE_COSTS: Record<VideoStyle, number> = {
  cinematic: 250,
  ugc: 150,
  montage: 200,
  multi_shot: 300,
  continuous: 200,
  unboxing: 180,
  lifestyle: 170,
  collage_motion_graphic: 350,
  brand_short_video: 280,
  explainer_video: 400,
};

export const SHOT_COSTS: Record<number, number> = {
  3: 0,
  4: 15,
  5: 30,
  6: 50,
  7: 75,
  8: 100,
  9: 140,
  10: 180,
};

export const PHASE_ORDER = [
  "init",
  "trends",
  "concept",
  "script",
  "asset",
  "audio",
  "re_edit",
  "validate",
  "publish",
  "done",
] as const;

export type Phase = (typeof PHASE_ORDER)[number];

export const PHASE_AGENT_MAP: Record<Phase, string> = {
  init: "trends_agent.md",
  trends: "trends_agent.md",
  concept: "concept_agent.md",
  script: "script_agent.md",
  asset: "asset_agent.md",
  audio: "audio_agent.md",
  re_edit: "script_agent.md",
  validate: "validation_agent.md",
  publish: "publish_agent.md",
  done: "",
};
