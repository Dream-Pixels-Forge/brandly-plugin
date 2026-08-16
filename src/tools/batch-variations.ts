import { tool } from "@opencode-ai/plugin";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PHASE_ORDER, VIDEO_STYLES } from "../constants";
import type { ToolContext, ProjectData } from "../types";

interface VariationConfig {
  id: string;
  name: string;
  style: string;
  hook: string;
  cta: string;
  shotCount: number;
  duration: number;
  tone: string[];
  musicMood: string;
  voiceoverStyle: string;
}

const HOOKS = [
  "Problem-first: Show the pain point immediately",
  "Product-reveal: Dramatic unveil of the product",
  "Social-proof: Start with testimonial or stats",
  "Lifestyle: Show the aspirational life with product",
  "Before-after: Transform from problem to solution",
  "Behind-the-scenes: Show how it's made",
  "Challenge: Pose a question or challenge",
  "Urgency: Limited time or scarcity angle",
];

const CTAS = [
  "Shop now — link in bio",
  "Try it free today",
  "Join the waitlist",
  "Get 20% off with code LAUNCH",
  "See it in action",
  "Order yours now",
  "Learn more at brand.com",
  "Start your free trial",
];

const TONES = [
  ["professional", "modern", "clean"],
  ["playful", "energetic", "bold"],
  ["luxury", "elegant", "premium"],
  ["minimal", "calm", "sophisticated"],
  ["edgy", "urban", "raw"],
  ["warm", "friendly", "approachable"],
  ["dramatic", "cinematic", "epic"],
  ["funny", "quirky", "lighthearted"],
];

function generateVariationId(): string {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBatchVariationsTool(ctx: ToolContext) {
  return tool({
    description:
      "Generate multiple variations of a video concept with different hooks, styles, CTAs, and tones. Create N variations from one idea, each as a separate project, then compare and pick the best.",
    args: {
      projectID: tool.schema.string().describe("Source project ID to create variations from"),
      variations: tool.schema.number().optional().describe("Number of variations to generate (1-10, default 3)"),
      autoGenerate: tool.schema.boolean().optional().describe("Auto-generate variation configs or use manual ones"),
    },
    async execute(args) {
      const count = Math.min(10, Math.max(1, args.variations || 3));

      const sourceDir = join(ctx.directory, ".brandly", "projects", args.projectID);
      if (!existsSync(sourceDir)) {
        throw new Error(`Project ${args.projectID} not found`);
      }
      const sourceProject: ProjectData = JSON.parse(
        readFileSync(join(sourceDir, "project.json"), "utf-8")
      );

      let configs: VariationConfig[] = [];

      // Auto-generate diverse variations
      const usedStyles = new Set<string>();
      const usedHooks = new Set<number>();
      const usedTones = new Set<number>();

      for (let i = 0; i < count; i++) {
        const styleKeys = Object.keys(VIDEO_STYLES);
        let style: string;
        do {
          style = styleKeys[Math.floor(Math.random() * styleKeys.length)];
        } while (usedStyles.has(style) && usedStyles.size < styleKeys.length);
        usedStyles.add(style);

        let hookIdx: number;
        do {
          hookIdx = Math.floor(Math.random() * HOOKS.length);
        } while (usedHooks.has(hookIdx) && usedHooks.size < HOOKS.length);
        usedHooks.add(hookIdx);

        let toneIdx: number;
        do {
          toneIdx = Math.floor(Math.random() * TONES.length);
        } while (usedTones.has(toneIdx) && usedTones.size < TONES.length);
        usedTones.add(toneIdx);

        configs.push({
          id: generateVariationId(),
          name: `${sourceProject.name || "Variation"} — ${style} ${i + 1}`,
          style,
          hook: HOOKS[hookIdx],
          cta: CTAS[i % CTAS.length],
          shotCount: sourceProject.shotCount || 5,
          duration: 15,
          tone: TONES[toneIdx],
          musicMood: ["upbeat", "dramatic", "chill", "epic", "playful"][i % 5],
          voiceoverStyle: ["professional", "energetic", "calm", "bold", "warm"][i % 5],
        });
      }

      const variationsDir = join(ctx.directory, "variations", args.projectID);
      mkdirSync(variationsDir, { recursive: true });

      const createdVariations = [];

      for (const config of configs) {
        const varDir = join(variationsDir, config.id);
        mkdirSync(varDir, { recursive: true });

        const variationProject: ProjectData = {
          id: config.id,
          name: config.name,
          description: sourceProject.description,
          style: config.style as any,
          shotCount: config.shotCount,
          budget: sourceProject.budget,
          spent: 0,
          currentPhase: "init",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phases: {},
        };

        writeFileSync(
          join(varDir, "project.json"),
          JSON.stringify(variationProject, null, 2)
        );

        createdVariations.push({
          id: config.id,
          name: config.name,
          style: config.style,
          hook: config.hook,
          cta: config.cta,
          tone: config.tone,
          path: varDir,
        });
      }

      const sourceProjectPath = join(sourceDir, "project.json");
      writeFileSync(sourceProjectPath, JSON.stringify(sourceProject, null, 2));

      return {
        output: JSON.stringify({
          sourceProjectID: args.projectID,
          variationsCount: createdVariations.length,
          variations: createdVariations,
          message: `Created ${createdVariations.length} variations in ${variationsDir}`,
        }),
      };
    },
  });
}
