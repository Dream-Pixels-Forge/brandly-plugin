import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

class BudgetExceededError extends Error {
  constructor(spent: number, budget: number) {
    super(`Budget exceeded: ${spent} spent of ${budget} budget`);
    this.name = "BudgetExceededError";
  }
}

export function createCostTool(ctx: ToolContext) {
  return tool({
    description:
      "Record actual credit spend for a phase operation. Call this after any MCP generation tool completes to track real costs against the project budget.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      phase: tool.schema.string().describe("Pipeline phase that incurred the cost"),
      action: tool.schema.string().describe("What the credits were spent on"),
      credits: tool.schema.number().describe("Credits spent"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      const newSpent = project.spent + args.credits;
      if (newSpent > project.budget) {
        throw new BudgetExceededError(newSpent, project.budget);
      }

      project.spent = newSpent;
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(args.projectID, project);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          phase: args.phase,
          action: args.action,
          credits: args.credits,
          totalSpent: newSpent,
          budget: project.budget,
          remaining: project.budget - newSpent,
          status: "recorded",
        }),
      };
    },
  });
}
