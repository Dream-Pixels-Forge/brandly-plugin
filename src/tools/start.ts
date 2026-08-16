import { join } from "node:path";
import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext, ProjectData } from "../types";
import type { VideoStyle } from "../constants";
import { generateProjectId, VIDEO_STYLES } from "../constants";

export function createStartTool(ctx: ToolContext) {
  return tool({
    description:
      "Start a new Brandly video project. Provide a product idea (and optionally an image) to kick off the agent pipeline. Creates a new project directory and returns the project ID.",
    args: {
      idea: tool.schema.string().describe("Product idea, concept, or brief"),
      productName: tool.schema.string().describe("Name of the product"),
      imagePath: tool.schema.string().optional().describe("Optional path to a product image"),
      targetPlatforms: tool.schema
        .array(tool.schema.enum(["tiktok", "instagram", "youtube", "all"]))
        .default(["tiktok", "instagram"])
        .describe("Target social platforms"),
      budgetCredits: tool.schema.number().default(500).describe("Max credits to spend on this project"),
      style: tool.schema.enum(VIDEO_STYLES).optional().describe("Video style preference"),
    },
    async execute(args) {
      const projectId = generateProjectId();
      const projectDir = join(ctx.projectsDir, projectId);

      await mkdir(projectDir, { recursive: true });
      await mkdir(join(projectDir, "artifacts"), { recursive: true });

      const project: ProjectData = {
        id: projectId,
        name: args.productName,
        description: args.idea,
        status: "pending",
        style: (args.style as VideoStyle) || "cinematic",
        shotCount: 5,
        budget: args.budgetCredits,
        spent: 0,
        currentPhase: "init",
        phases: {
          init: { status: "pending" },
        },
        hooks: [],
        settings: [],
        targetPlatforms: args.targetPlatforms,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(projectId, project);

      if (typeof args.imagePath === "string") {
        const imagesDir = join(ctx.imagesDir, projectId);
        await mkdir(imagesDir, { recursive: true });
        if (existsSync(args.imagePath)) {
          await copyFile(args.imagePath, join(imagesDir, "product.png"));
        }
      }

      return {
        output: JSON.stringify({
          projectId,
          status: "created",
          message: `Project "${args.productName}" created with ID: ${projectId}`,
          nextPhase: "init",
        }),
      };
    },
  });
}
