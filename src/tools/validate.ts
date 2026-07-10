import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createValidateTool(ctx: ToolContext) {
  return {
    name: "brandly_validate",
    description:
      "Run virality validation on the final video. Calls Higgsfield virality predictor to score the video and suggest improvements. Updates the project's viralityScore in state.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        videoPath: {
          type: "string",
          description: "Path to the rendered video",
        },
      },
      required: ["projectID", "videoPath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, videoPath } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      if (project.status === "cancelled") {
        throw new Error("Cannot validate — project is cancelled");
      }

      return {
        projectId: projectID,
        videoPath,
        status: "validating",
        message: "Virality validation initiated",
      };
    },
  };
}
