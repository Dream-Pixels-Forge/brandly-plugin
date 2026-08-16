import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createArtifactTool(ctx: ToolContext) {
  return tool({
    description:
      "Save a subagent's output to the .brandly project folder. Call this after a subagent completes to persist its markdown/json output for reusability.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      category: tool.schema
        .enum(["analysis", "script", "storyboard", "assets", "audio"])
        .describe("Artifact category folder in .brandly/projects/{id}/"),
      filename: tool.schema
        .string()
        .describe("Filename to save as (e.g. 'script.md', 'asset-plan.json')"),
      content: tool.schema.string().describe("The text content to save"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const projectDir = join(ctx.projectsDir, args.projectID);
      const artifactDir = join(projectDir, "artifacts", args.category);
      await mkdir(artifactDir, { recursive: true });

      const filePath = join(artifactDir, args.filename);
      await ctx.writeAtomic(filePath, args.content);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          category: args.category,
          filename: args.filename,
          path: filePath,
          status: "saved",
          message: `Artifact saved: ${args.category}/${args.filename}`,
        }),
      };
    },
  });
}
