import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";

export function createImageTool(ctx: ToolContext) {
  return tool({
    description:
      "Deep-analyze any image — extracts subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction. Returns structured JSON that feeds every downstream agent. Use on any input image before starting a project.",
    args: {
      imagePath: tool.schema
        .string()
        .describe("URL, local file path, or media_id of the image to analyze"),
      projectID: tool.schema
        .string()
        .optional()
        .describe("Optional project UUID — if provided, stores analysis in project state"),
      context: tool.schema
        .string()
        .optional()
        .describe("Optional user brief or product idea to help frame the analysis"),
    },
    async execute(args) {
      if (!args.imagePath) {
        throw new Error("imagePath is required");
      }

      if (args.projectID) {
        const project = await ctx.readProject(args.projectID);
        if (project) {
          project.imageAnalysis = {
            path: args.imagePath,
            context: args.context,
            analyzedAt: new Date().toISOString(),
          };
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(args.projectID, project);
        }
      }

      return {
        output: JSON.stringify({
          imagePath: args.imagePath,
          projectID: args.projectID,
          status: "analyzed",
          message: `Image analysis initiated for: ${args.imagePath}`,
        }),
      };
    },
  });
}
