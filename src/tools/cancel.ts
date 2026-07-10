import type { ToolContext, ProjectData } from "../types";
import { isValidProjectId } from "../constants";

export function createCancelTool(ctx: ToolContext) {
  return {
    name: "brandly_cancel",
    description:
      "Pause or cancel a running Brandly project. Paused projects can be resumed later; cancelled projects are permanently stopped. Cannot be undone once cancelled.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        action: {
          type: "string",
          enum: ["pause", "cancel"],
          default: "cancel",
          description: "Whether to pause (reversible) or cancel (permanent)",
        },
        reason: {
          type: "string",
          description: "Optional reason for pausing/cancelling",
        },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, action, reason } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const currentStatus = project.status as string;
      if (currentStatus === "cancelled") {
        throw new Error("Project is already cancelled");
      }
      if (currentStatus === "completed") {
        throw new Error("Cannot cancel a completed project");
      }

      const newStatus = action === "pause" ? "paused" : "cancelled";

      const updatedProject = {
        ...project,
        status: newStatus as ProjectData["status"],
        ...(action === "cancel" ? { cancelledAt: new Date().toISOString() } : {}),
        ...(action === "pause" ? { pausedAt: new Date().toISOString() } : {}),
        ...(reason ? { cancelReason: reason } : {}),
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(projectID as string, updatedProject);

      return {
        projectId: projectID,
        previousStatus: currentStatus,
        newStatus,
        action,
        reason: reason || null,
        message:
          action === "pause"
            ? `Project paused. Use brandly_approve to resume.`
            : `Project cancelled permanently.`,
      };
    },
  };
}
