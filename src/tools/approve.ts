import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER } from "../constants";

export function createApproveTool(ctx: ToolContext) {
  return {
    name: "brandly_approve",
    description:
      "Approve the current phase output and advance the pipeline to the next phase. Must be called after each agent completes to proceed.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        phase: {
          type: "string",
          enum: PHASE_ORDER,
          description: "The phase being approved",
        },
      },
      required: ["projectID", "phase"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, phase } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      if (project.status === "cancelled") {
        throw new Error("Cannot approve — project is cancelled");
      }
      if (project.status === "paused") {
        throw new Error(
          "Cannot approve — project is paused. Use brandly_cancel to resume first."
        );
      }
      if (project.status === "completed") {
        throw new Error("Cannot approve — project is already completed");
      }

      if (project.currentPhase !== phase) {
        throw new Error(
          `Cannot approve phase "${phase}" — current phase is "${project.currentPhase}"`
        );
      }

      const currentIdx = PHASE_ORDER.indexOf(phase as any);
      const nextPhase =
        currentIdx < PHASE_ORDER.length - 1
          ? PHASE_ORDER[currentIdx + 1]
          : "done";

      const phases = (project.phases as Record<string, any>) || {};
      phases[phase as string] = {
        ...(phases[phase as string] || {}),
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      phases[nextPhase] = {
        status: "pending",
        startedAt: new Date().toISOString(),
      };

      const updatedProject = {
        ...project,
        currentPhase: nextPhase,
        phases,
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(projectID as string, updatedProject);

      return {
        projectId: projectID,
        approvedPhase: phase,
        nextPhase,
        status: "approved",
        message: `Phase "${phase}" approved. Next phase: "${nextPhase}"`,
      };
    },
  };
}
