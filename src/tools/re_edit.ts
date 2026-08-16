import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createReEditTool(ctx: ToolContext) {
  return tool({
    description:
      "Re-edit a specific shot in the project. Provide the shot ID and a new prompt/description. The pipeline will regenerate that shot.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      shotId: tool.schema.number().describe("The shot ID to re-edit"),
      newPrompt: tool.schema.string().describe("New prompt for the shot"),
      reason: tool.schema.string().describe("Why you're re-editing this shot"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      const agentFile = "script_agent.md";

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          shotId: args.shotId,
          newPrompt: args.newPrompt,
          reason: args.reason,
          agent: agentFile,
          status: "re_editing",
          message: `Re-editing shot ${args.shotId}: ${args.reason}`,
        }),
      };
    },
  });
}
