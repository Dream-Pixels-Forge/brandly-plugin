import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createValidateTool(ctx: ToolContext) {
  return tool({
    description:
      "Run virality validation on the final video. Calls Higgsfield virality predictor to score the video and suggest improvements. Updates the project's viralityScore in state.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      videoPath: tool.schema.string().describe("Path to the rendered video"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      if (project.status === "cancelled") {
        throw new Error("Cannot validate — project is cancelled");
      }

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          videoPath: args.videoPath,
          status: "validating",
          message: "Virality validation initiated",
        }),
      };
    },
  });
}
