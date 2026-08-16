import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createVideoRenderTool(ctx: ToolContext) {
  return tool({
    description:
      "Render a Remotion composition to produce the final video file. Executes remotion render command to generate MP4, WebM, or GIF output.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      compositionPath: tool.schema.string().describe("Path to the Remotion composition file"),
      outputPath: tool.schema.string().optional().describe("Output video file path (optional)"),
      format: tool.schema.enum(["mp4", "webm", "gif"]).default("mp4").describe("Output video format"),
      quality: tool.schema.enum(["low", "medium", "high", "ultra"]).default("high").describe("Rendering quality preset"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      if (!existsSync(args.compositionPath)) {
        throw new Error(`Composition file not found: ${args.compositionPath}`);
      }

      const outputDir = join(ctx.directory, "renders", args.projectID);
      await mkdir(outputDir, { recursive: true });

      const finalOutputPath =
        args.outputPath || join(outputDir, `render-${Date.now()}.${args.format}`);

      const renderCommand = generateRenderCommand(
        args.compositionPath,
        finalOutputPath,
        args.format,
        args.quality
      );

      const scriptPath = join(outputDir, `render-${Date.now()}.sh`);
      await writeFile(scriptPath, renderCommand, "utf-8");

      const renderMeta = {
        id: `render-${Date.now()}`,
        compositionPath: args.compositionPath,
        outputPath: finalOutputPath,
        format: args.format,
        quality: args.quality,
        command: renderCommand,
        scriptPath,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const metaPath = join(outputDir, `render-${renderMeta.id}.json`);
      await writeFile(metaPath, JSON.stringify(renderMeta, null, 2), "utf-8");

      if (!project.phases) {
        project.phases = {};
      }

      const currentPhase = project.currentPhase as string;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }

      const phaseOutput = project.phases[currentPhase].output
        ? JSON.parse(project.phases[currentPhase].output || "{}")
        : {};

      if (!phaseOutput.renders) {
        phaseOutput.renders = [];
      }

      phaseOutput.renders.push({
        renderId: renderMeta.id,
        compositionPath: args.compositionPath,
        outputPath: finalOutputPath,
        format: args.format,
        quality: args.quality,
        scriptPath,
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(args.projectID, project);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          renderId: renderMeta.id,
          compositionPath: args.compositionPath,
          outputPath: finalOutputPath,
          format: args.format,
          quality: args.quality,
          scriptPath,
          status: "created",
          message: `Render script created: ${scriptPath}`,
          renderCommand: renderCommand,
          nextSteps: [
            "1. Install Remotion if not present: npm i -g remotion",
            "2. Run the render script: bash " + scriptPath,
            "3. Or run manually: " + renderCommand,
            "4. Wait for rendering to complete",
            "5. Output will be saved to: " + finalOutputPath,
          ],
        }),
      };
    },
  });
}

function generateRenderCommand(
  compositionPath: string,
  outputPath: string,
  format: string,
  quality: string
): string {
  const qualityFlags: Record<string, string> = {
    low: "--quality 50",
    medium: "--quality 75",
    high: "--quality 90",
    ultra: "--quality 100",
  };

  const qualityFlag = qualityFlags[quality] || qualityFlags.high;

  const formatFlags: Record<string, string> = {
    mp4: "--codec h264",
    webm: "--codec vp8",
    gif: "--codec gif",
  };

  const formatFlag = formatFlags[format] || formatFlags.mp4;

  return `#!/bin/bash
# Brandly Video Render Script
# Generated: ${new Date().toISOString()}

# Check if Remotion is installed
if ! command -v remotion &> /dev/null; then
    echo "Remotion is not installed. Installing..."
    npm i -g remotion
fi

# Render the video
echo "Rendering video..."
remotion render "${compositionPath}" "${outputPath}" ${formatFlag} ${qualityFlag}

# Check if render was successful
if [ $? -eq 0 ]; then
    echo "✅ Render complete: ${outputPath}"
else
    echo "❌ Render failed"
    exit 1
fi
`;
}
