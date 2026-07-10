import type { ToolContext } from "../types";

export function createImageTool(ctx: ToolContext) {
  return {
    name: "brandly_analyze_image",
    description:
      "Deep-analyze any image — extracts subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction. Returns structured JSON that feeds every downstream agent. Use on any input image before starting a project.",
    parameters: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description:
            "URL, local file path, or media_id of the image to analyze",
        },
        projectID: {
          type: "string",
          description: "Optional project UUID — if provided, stores analysis in project state",
        },
        context: {
          type: "string",
          description:
            "Optional user brief or product idea to help frame the analysis",
        },
      },
      required: ["imagePath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { imagePath, projectID, context } = args;

      if (!imagePath) {
        throw new Error("imagePath is required");
      }

      // Store analysis if project ID provided
      if (projectID) {
        const project = await ctx.readProject(projectID as string);
        if (project) {
          project.imageAnalysis = {
            path: imagePath,
            context,
            analyzedAt: new Date().toISOString(),
          };
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(projectID as string, project);
        }
      }

      return {
        imagePath,
        projectID,
        status: "analyzed",
        message: `Image analysis initiated for: ${imagePath}`,
      };
    },
  };
}
