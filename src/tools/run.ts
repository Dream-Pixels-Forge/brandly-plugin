import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_AGENT_MAP } from "../constants";
import { withRetry } from "../retry";

export function createRunTool(ctx: ToolContext) {
  return tool({
    description:
      "Run the next phase of the Brandly pipeline. Reads the current phase and dispatches the appropriate agent subagent. Call after brandly_approve to advance the pipeline.",
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

      if (project.status === "cancelled") {
        throw new Error("Cannot run — project is cancelled");
      }
      if (project.status === "paused") {
        throw new Error("Cannot run — project is paused");
      }

      const currentPhase = project.currentPhase as string;
      const agentFile = PHASE_AGENT_MAP[currentPhase as keyof typeof PHASE_AGENT_MAP];

      if (!agentFile) {
        return {
          output: JSON.stringify({
            projectId: args.projectID,
            status: "completed",
            message: "All phases completed",
          }),
        };
      }

      const agentPath = join(ctx.agentsDir, agentFile);
      if (!existsSync(agentPath)) {
        throw new Error(`Agent not found: ${agentFile}`);
      }

      const agentPrompt = await withRetry(
        () => readFile(agentPath, "utf-8"),
        {
          maxRetries: 2,
          baseDelayMs: 500,
          onRetry: (attempt, err) => {
            // Retry read on transient fs errors
          },
        }
      );

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          currentPhase,
          agent: agentFile,
          agentPrompt,
          status: "dispatched",
          message: `Dispatched ${agentFile} for phase "${currentPhase}"`,
        }),
      };
    },
  });
}
