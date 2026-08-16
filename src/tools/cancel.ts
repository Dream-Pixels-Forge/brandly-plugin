import { tool } from "@opencode-ai/plugin";
import type { ToolContext, ProjectData } from "../types";
import { isValidProjectId } from "../constants";

export function createCancelTool(ctx: ToolContext) {
  return tool({
    description:
      "Pause or cancel a running Brandly project. Paused projects can be resumed later; cancelled projects are permanently stopped. Cannot be undone once cancelled.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      action: tool.schema.enum(["pause", "cancel"]).default("cancel").describe("Whether to pause (reversible) or cancel (permanent)"),
      reason: tool.schema.string().optional().describe("Optional reason for pausing/cancelling"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      const currentStatus = project.status as string;
      if (currentStatus === "cancelled") {
        throw new Error("Project is already cancelled");
      }
      if (currentStatus === "completed") {
        throw new Error("Cannot cancel a completed project");
      }

      const newStatus = args.action === "pause" ? "paused" : "cancelled";

      const updatedProject = {
        ...project,
        status: newStatus as ProjectData["status"],
        ...(args.action === "cancel" ? { cancelledAt: new Date().toISOString() } : {}),
        ...(args.action === "pause" ? { pausedAt: new Date().toISOString() } : {}),
        ...(args.reason ? { cancelReason: args.reason } : {}),
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(args.projectID, updatedProject);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          previousStatus: currentStatus,
          newStatus,
          action: args.action,
          reason: args.reason || null,
          message:
            args.action === "pause"
              ? `Project paused. Use brandly_approve to resume.`
              : `Project cancelled permanently.`,
        }),
      };
    },
  });
}
