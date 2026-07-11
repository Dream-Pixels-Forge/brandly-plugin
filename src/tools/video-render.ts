import { join } from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createVideoRenderTool(ctx: ToolContext) {
  return {
    name: "brandly_render_video",
    description:
      "Render a Remotion composition to produce the final video file. Executes remotion render command to generate MP4, WebM, or GIF output.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        compositionPath: {
          type: "string",
          description: "Path to the Remotion composition file",
        },
        outputPath: {
          type: "string",
          description: "Output video file path (optional)",
        },
        format: {
          type: "string",
          enum: ["mp4", "webm", "gif"],
          default: "mp4",
          description: "Output video format",
        },
        quality: {
          type: "string",
          enum: ["low", "medium", "high", "ultra"],
          default: "high",
          description: "Rendering quality preset",
        },
      },
      required: ["projectID", "compositionPath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, compositionPath, outputPath, format, quality } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      if (!existsSync(compositionPath as string)) {
        throw new Error(`Composition file not found: ${compositionPath}`);
      }

      // Create output directory
      const outputDir = join(ctx.directory, "renders", projectID as string);
      await mkdir(outputDir, { recursive: true });

      // Generate output path if not provided
      const finalOutputPath =
        outputPath || join(outputDir, `render-${Date.now()}.${format}`);

      // Generate render command
      const renderCommand = generateRenderCommand(
        compositionPath as string,
        finalOutputPath,
        format as string,
        quality as string
      );

      // Save render script
      const scriptPath = join(outputDir, `render-${Date.now()}.sh`);
      await writeFile(scriptPath, renderCommand, "utf-8");

      // Save render metadata
      const renderMeta = {
        id: `render-${Date.now()}`,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        command: renderCommand,
        scriptPath,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const metaPath = join(outputDir, `render-${renderMeta.id}.json`);
      await writeFile(metaPath, JSON.stringify(renderMeta, null, 2), "utf-8");

      // Update project with render info
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
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        scriptPath,
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID as string, project);

      return {
        projectId: projectID,
        renderId: renderMeta.id,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
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
      };
    },
  };
}

function generateRenderCommand(
  compositionPath: string,
  outputPath: string,
  format: string,
  quality: string
): string {
  // Quality presets
  const qualityFlags: Record<string, string> = {
    low: "--quality 50",
    medium: "--quality 75",
    high: "--quality 90",
    ultra: "--quality 100",
  };

  const qualityFlag = qualityFlags[quality] || qualityFlags.high;

  // Format-specific flags
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
