import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createReEditTool(ctx: ToolContext) {
  return {
    name: "brandly_re_edit",
    description:
      "Re-edit a specific shot in the project. Provide the shot ID and a new prompt/description. The pipeline will regenerate that shot.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        shotId: {
          type: "number",
          description: "The shot ID to re-edit",
        },
        newPrompt: {
          type: "string",
          description: "New prompt for the shot",
        },
        reason: {
          type: "string",
          description: "Why you're re-editing this shot",
        },
      },
      required: ["projectID", "shotId", "newPrompt", "reason"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, shotId, newPrompt, reason } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Dispatch to script agent for re-editing
      const agentFile = "script_agent.md";

      return {
        projectId: projectID,
        shotId,
        newPrompt,
        reason,
        agent: agentFile,
        status: "re_editing",
        message: `Re-editing shot ${shotId}: ${reason}`,
      };
    },
  };
}
