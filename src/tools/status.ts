import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER, PHASE_AGENT_MAP } from "../constants";

export function createStatusTool(ctx: ToolContext) {
  return {
    name: "brandly_status",
    description:
      "Show the current status of a Brandly project — which phase it's in, budget spent, virality score, and artifacts produced.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      return {
        projectId: project.id,
        name: project.name,
        status: project.status,
        currentPhase: project.currentPhase,
        budget: project.budget,
        spent: project.spent,
        remaining: project.budget - project.spent,
        phases: project.phases,
        targetPlatforms: project.targetPlatforms,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    },
  };
}
