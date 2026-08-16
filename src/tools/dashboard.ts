import { spawn } from "node:child_process";
import { join } from "node:path";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";

let serverProcess: ReturnType<typeof spawn> | null = null;
let serverPort = 5175;

export function createDashboardTool(ctx: ToolContext) {
  return tool({
    description:
      "Open the Brandly Director Dashboard — a real-time web UI showing project pipeline, virality scores, costs, artifacts, and history. Starts the server if not running and returns the URL.",
    args: {
      action: tool.schema
        .enum(["open", "start", "stop", "status"])
        .default("open")
        .describe("Dashboard action: open (start + return URL), start, stop, or check status"),
    },
    async execute(args) {
      if (args.action === "status") {
        if (serverProcess && !serverProcess.killed) {
          return {
            output: JSON.stringify({
              status: "running",
              port: serverPort,
              url: `http://localhost:${serverPort}`,
              message: `Dashboard is running at http://localhost:${serverPort}`,
            }),
          };
        }
        return {
          output: JSON.stringify({
            status: "stopped",
            message: "Dashboard server is not running. Use action='open' to start it.",
          }),
        };
      }

      if (args.action === "stop") {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill();
          serverProcess = null;
          return {
            output: JSON.stringify({
              status: "stopped",
              message: "Dashboard server stopped.",
            }),
          };
        }
        return {
          output: JSON.stringify({
            status: "already_stopped",
            message: "Dashboard server was not running.",
          }),
        };
      }

      // start or open
      if (serverProcess && !serverProcess.killed) {
        return {
          output: JSON.stringify({
            status: "already_running",
            port: serverPort,
            url: `http://localhost:${serverPort}`,
            message: `Dashboard is already running at http://localhost:${serverPort}`,
          }),
        };
      }

      const dashboardDir = join(ctx.workDir, "dashboard");

      // Start the API server
      serverProcess = spawn("bun", ["run", "server/src/server.ts"], {
        cwd: dashboardDir,
        stdio: "ignore",
        detached: true,
      });

      serverProcess.on("error", (err) => {
        console.error("Dashboard server failed to start:", err.message);
        serverProcess = null;
      });

      serverProcess.on("exit", () => {
        serverProcess = null;
      });

      // Give the server a moment to start
      await new Promise((r) => setTimeout(r, 1500));

      return {
        output: JSON.stringify({
          status: "started",
          port: serverPort,
          url: `http://localhost:${serverPort}`,
          message: `Dashboard server started at http://localhost:${serverPort}\n\nOpen this URL in your browser to view the project dashboard with real-time pipeline status, virality scores, costs, artifacts, and history.`,
        }),
      };
    },
  });
}
