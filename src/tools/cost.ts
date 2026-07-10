import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

class BudgetExceededError extends Error {
  constructor(spent: number, budget: number) {
    super(`Budget exceeded: ${spent} spent of ${budget} budget`);
    this.name = "BudgetExceededError";
  }
}

export function createCostTool(ctx: ToolContext) {
  return {
    name: "brandly_record_cost",
    description:
      "Record actual credit spend for a phase operation. Call this after any MCP generation tool completes to track real costs against the project budget.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        phase: {
          type: "string",
          description: "Pipeline phase that incurred the cost",
        },
        action: {
          type: "string",
          description: "What the credits were spent on",
        },
        credits: {
          type: "number",
          exclusiveMinimum: 0,
          description: "Credits spent",
        },
      },
      required: ["projectID", "phase", "action", "credits"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, phase, action, credits } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const newSpent = project.spent + (credits as number);
      if (newSpent > project.budget) {
        throw new BudgetExceededError(newSpent, project.budget);
      }

      project.spent = newSpent;
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID as string, project);

      return {
        projectId: projectID,
        phase,
        action,
        credits,
        totalSpent: newSpent,
        budget: project.budget,
        remaining: project.budget - newSpent,
        status: "recorded",
      };
    },
  };
}
