import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER } from "../constants";

export function createProgressTool(ctx: ToolContext) {
  return tool({
    description:
      "Show progress of a Brandly project — overall % complete, phase-by-phase status, time in current phase, and estimated time remaining.",
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

      const phases = (project.phases as Record<string, any>) || {};

      const totalPhases = PHASE_ORDER.length;
      const completedPhases = PHASE_ORDER.filter(
        (p) => phases[p]?.status === "completed"
      ).length;
      const overallPercent = Math.round(
        (completedPhases / totalPhases) * 100
      );

      const currentPhase = project.currentPhase as string;
      const currentPhaseData = phases[currentPhase];

      let timeInCurrentPhase: string | null = null;
      if (currentPhaseData?.startedAt) {
        const elapsed =
          Date.now() - new Date(currentPhaseData.startedAt).getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        timeInCurrentPhase = `${minutes}m ${seconds}s`;
      }

      const remaining = PHASE_ORDER.filter(
        (p) => !phases[p] || phases[p].status === "pending"
      ).length;
      const avgPhaseTime = completedPhases > 0
        ? (() => {
            const completed = PHASE_ORDER.filter(
              (p) => phases[p]?.status === "completed" && phases[p]?.startedAt && phases[p]?.completedAt
            );
            if (completed.length === 0) return null;
            const totalTime = completed.reduce((sum, p) => {
              const start = new Date(phases[p].startedAt).getTime();
              const end = new Date(phases[p].completedAt).getTime();
              return sum + (end - start);
            }, 0);
            return Math.round(totalTime / completed.length);
          })()
        : null;

      let estimatedRemaining: string | null = null;
      if (avgPhaseTime && remaining > 0) {
        const estMs = avgPhaseTime * remaining;
        const estMin = Math.floor(estMs / 60000);
        const estSec = Math.floor((estMs % 60000) / 1000);
        estimatedRemaining = `~${estMin}m ${estSec}s`;
      }

      const phaseStatuses: Record<string, string> = {};
      for (const p of PHASE_ORDER) {
        phaseStatuses[p] = phases[p]?.status || "pending";
      }

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          projectStatus: project.status,
          currentPhase,
          overallPercent,
          completedPhases,
          totalPhases,
          phases: phaseStatuses,
          timeInCurrentPhase,
          estimatedRemaining,
          status:
            project.status === "cancelled"
              ? "Project cancelled"
              : project.status === "paused"
              ? "Project paused"
              : project.status === "completed"
              ? "All phases complete"
              : `Phase ${completedPhases}/${totalPhases} (${overallPercent}%)`,
        }),
      };
    },
  });
}
