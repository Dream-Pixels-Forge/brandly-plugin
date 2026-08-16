import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER, PHASE_AGENT_MAP } from "../constants";

export function createStatusTool(ctx: ToolContext) {
  return tool({
    description:
      "Show the current status of a Brandly project — which phase it's in, budget spent, virality score, and artifacts produced.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      return {
        output: JSON.stringify({
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
        }),
      };
    },
  });
}
