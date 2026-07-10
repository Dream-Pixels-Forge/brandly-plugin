import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext, ProjectData } from "../types";
import type { VideoStyle } from "../constants";
import { generateProjectId, isValidProjectId, VIDEO_STYLES } from "../constants";

export function createStartTool(ctx: ToolContext) {
  return {
    name: "brandly_start",
    description:
      "Start a new Brandly video project. Provide a product idea (and optionally an image) to kick off the agent pipeline. Creates a new project directory and returns the project ID.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description:
            "Product idea, concept, or brief",
        },
        productName: {
          type: "string",
          description: "Name of the product",
        },
        imagePath: {
          type: "string",
          description: "Optional path to a product image",
        },
        targetPlatforms: {
          type: "array",
          items: { type: "string", enum: ["tiktok", "instagram", "youtube", "all"] },
          default: ["tiktok", "instagram"],
          description: "Target social platforms",
        },
        budgetCredits: {
          type: "number",
          default: 500,
          exclusiveMinimum: 0,
          description: "Max credits to spend on this project",
        },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style preference",
        },
      },
      required: ["idea", "productName"],
    },
    execute: async (args: Record<string, unknown>) => {
      const {
        idea,
        productName,
        imagePath,
        targetPlatforms,
        budgetCredits,
        style,
      } = args as {
        idea?: string;
        productName?: string;
        imagePath?: string;
        targetPlatforms?: string[];
        budgetCredits?: number;
        style?: string;
      };

      const projectId = generateProjectId();
      const projectDir = join(ctx.projectsDir, projectId);

      await mkdir(projectDir, { recursive: true });
      await mkdir(join(projectDir, "artifacts"), { recursive: true });

      const project: ProjectData = {
        id: projectId,
        name: productName,
        description: idea,
        status: "pending",
        style: (style as VideoStyle) || "cinematic",
        shotCount: 5,
        budget: (budgetCredits as number) || 500,
        spent: 0,
        currentPhase: "init",
        phases: {
          init: { status: "pending" },
        },
        hooks: [],
        settings: [],
        targetPlatforms: (targetPlatforms as string[]) || [
          "tiktok",
          "instagram",
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(projectId, project);

      if (typeof imagePath === "string") {
        const imagesDir = join(ctx.imagesDir, projectId);
        await mkdir(imagesDir, { recursive: true });
        if (existsSync(imagePath)) {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(imagePath, join(imagesDir, "product.png"));
        }
      }

      return {
        projectId,
        status: "created",
        message: `Project "${productName}" created with ID: ${projectId}`,
        nextPhase: "init",
      };
    },
  };
}
