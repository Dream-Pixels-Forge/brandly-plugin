import { Tool } from "@opencode-ai/plugin";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PHASE_ORDER, VIDEO_STYLES } from "../constants";
import { ToolContext, ProjectData } from "../types";

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

export function createBatchVariationsTool(ctx: ToolContext): Tool {
  return {
    name: "brandly_batch_variations",
    description:
      "Generate multiple variations of a video concept with different hooks, styles, CTAs, and tones. Create N variations from one idea, each as a separate project, then compare and pick the best.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectID: {
          type: "string",
          description: "Source project ID to create variations from",
        },
        variations: {
          type: "number",
          description: "Number of variations to generate (1-10, default 3)",
        },
        autoGenerate: {
          type: "boolean",
          description: "Auto-generate variation configs or use manual ones",
        },
        customVariations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              style: { type: "string" },
              hook: { type: "string" },
              cta: { type: "string" },
              shotCount: { type: "number" },
              tone: { type: "array", items: { type: "string" } },
              musicMood: { type: "string" },
              voiceoverStyle: { type: "string" },
            },
          },
          description: "Manual variation configs (overrides autoGenerate)",
        },
      },
      required: ["projectID"],
    },
    execute: async (input: {
      projectID: string;
      variations?: number;
      autoGenerate?: boolean;
      customVariations?: Array<{
        name?: string;
        style?: string;
        hook?: string;
        cta?: string;
        shotCount?: number;
        tone?: string[];
        musicMood?: string;
        voiceoverStyle?: string;
      }>;
    }) => {
      const { projectID, customVariations } = input;
      const count = Math.min(10, Math.max(1, input.variations || 3));

      // Validate source project
      const sourceDir = join(ctx.directory, ".brandly", "projects", projectID);
      if (!existsSync(sourceDir)) {
        throw new Error(`Project ${projectID} not found`);
      }
      const sourceProject: ProjectData = JSON.parse(
        readFileSync(join(sourceDir, "project.json"), "utf-8")
      );

      // Build variation configs
      let configs: VariationConfig[] = [];

      if (customVariations && customVariations.length > 0) {
        configs = customVariations.map((v, i) => ({
          id: generateVariationId(),
          name: v.name || `Variation ${i + 1}`,
          style: v.style || sourceProject.style || "cinematic",
          hook: v.hook || HOOKS[i % HOOKS.length],
          cta: v.cta || CTAS[i % CTAS.length],
          shotCount: v.shotCount || sourceProject.shotCount || 5,
          duration: sourceProject.duration || 15,
          tone: v.tone || TONES[i % TONES.length],
          musicMood: v.musicMood || "upbeat",
          voiceoverStyle: v.voiceoverStyle || "professional",
        }));
      } else {
        // Auto-generate diverse variations
        const usedStyles = new Set<string>();
        const usedHooks = new Set<number>();
        const usedTones = new Set<number>();

        for (let i = 0; i < count; i++) {
          // Pick unique style
          const styleKeys = Object.keys(VIDEO_STYLES);
          let style: string;
          do {
            style = styleKeys[Math.floor(Math.random() * styleKeys.length)];
          } while (usedStyles.has(style) && usedStyles.size < styleKeys.length);
          usedStyles.add(style);

          // Pick unique hook
          let hookIdx: number;
          do {
            hookIdx = Math.floor(Math.random() * HOOKS.length);
          } while (usedHooks.has(hookIdx) && usedHooks.size < HOOKS.length);
          usedHooks.add(hookIdx);

          // Pick unique tone
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
            duration: sourceProject.duration || 15,
            tone: TONES[toneIdx],
            musicMood: ["upbeat", "dramatic", "chill", "epic", "playful"][i % 5],
            voiceoverStyle: ["professional", "energetic", "calm", "bold", "warm"][i % 5],
          });
        }
      }

      // Create variation projects
      const variationsDir = join(ctx.directory, "variations", projectID);
      mkdirSync(variationsDir, { recursive: true });

      const createdVariations = [];

      for (const config of configs) {
        const varDir = join(variationsDir, config.id);
        mkdirSync(varDir, { recursive: true });

        // Create variation project
        const variationProject: ProjectData = {
          id: config.id,
          name: config.name,
          idea: sourceProject.idea,
          productName: sourceProject.productName,
          style: config.style,
          shotCount: config.shotCount,
          duration: config.duration,
          currentPhase: "init",
          status: "created",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phases: {},
          metadata: {
            ...sourceProject.metadata,
            variation: {
              parentProjectId: projectID,
              hook: config.hook,
              cta: config.cta,
              tone: config.tone,
              musicMood: config.musicMood,
              voiceoverStyle: config.voiceoverStyle,
            },
          },
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

      // Update source project with variation references
      const sourceProjectPath = join(sourceDir, "project.json");
      sourceProject.metadata = sourceProject.metadata || {};
      (sourceProject.metadata as any).variations = configs.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      writeFileSync(sourceProjectPath, JSON.stringify(sourceProject, null, 2));

      return {
        sourceProjectID: projectID,
        variationsCount: createdVariations.length,
        variations: createdVariations,
        message: `Created ${createdVariations.length} variations in ${variationsDir}`,
      };
    },
  };
}
