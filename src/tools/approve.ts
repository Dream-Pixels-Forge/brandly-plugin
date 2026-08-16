import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER } from "../constants";

export function createApproveTool(ctx: ToolContext) {
  return tool({
    description:
      "Approve the current phase output and advance the pipeline to the next phase. Must be called after each agent completes to proceed.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      phase: tool.schema.enum(PHASE_ORDER).describe("The phase being approved"),
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

      if (project.currentPhase !== args.phase) {
        throw new Error(
          `Cannot approve phase "${args.phase}" — current phase is "${project.currentPhase}"`
        );
      }

      const currentIdx = PHASE_ORDER.indexOf(args.phase);
      const nextPhase =
        currentIdx < PHASE_ORDER.length - 1
          ? PHASE_ORDER[currentIdx + 1]
          : "done";

      const phases = (project.phases as Record<string, any>) || {};
      phases[args.phase] = {
        ...(phases[args.phase] || {}),
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

      await ctx.writeProject(args.projectID, updatedProject);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          approvedPhase: args.phase,
          nextPhase,
          status: "approved",
          message: `Phase "${args.phase}" approved. Next phase: "${nextPhase}"`,
        }),
      };
    },
  });
}
