import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createArtifactTool(ctx: ToolContext) {
  return {
    name: "brandly_save_artifact",
    description:
      "Save a subagent's output to the .brandly project folder. Call this after a subagent completes to persist its markdown/json output for reusability.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        category: {
          type: "string",
          enum: ["analysis", "script", "storyboard", "assets", "audio"],
          description: "Artifact category folder in .brandly/projects/{id}/",
        },
        filename: {
          type: "string",
          description: "Filename to save as (e.g. 'script.md', 'asset-plan.json')",
        },
        content: {
          type: "string",
          description: "The text content to save",
        },
      },
      required: ["projectID", "category", "filename", "content"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, category, filename, content } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const projectDir = join(ctx.projectsDir, projectID as string);
      const artifactDir = join(projectDir, "artifacts", category as string);
      await mkdir(artifactDir, { recursive: true });

      const filePath = join(artifactDir, filename as string);
      await ctx.writeAtomic(filePath, content as string);

      return {
        projectId: projectID,
        category,
        filename,
        path: filePath,
        status: "saved",
        message: `Artifact saved: ${category}/${filename}`,
      };
    },
  };
}
