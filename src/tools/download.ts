import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

// Node.js 18+ has global fetch and Buffer available
// These are used directly without import

export function createDownloadTool(ctx: ToolContext) {
  return {
    name: "brandly_download",
    description:
      "Download generated media (images, videos, audio) from Higgsfield and save to project folders. Use after asset/audio phases to persist generated files locally.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        mediaType: {
          type: "string",
          enum: ["image", "video", "audio"],
          description: "Type of media to download",
        },
        mediaUrl: {
          type: "string",
          description: "URL of the generated media from Higgsfield",
        },
        filename: {
          type: "string",
          description: "Filename to save as (e.g. 'shot-1.mp4', 'hero.png')",
        },
        jobId: {
          type: "string",
          description: "Optional Higgsfield job ID for tracking",
        },
      },
      required: ["projectID", "mediaType", "mediaUrl", "filename"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, mediaType, mediaUrl, filename, jobId } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Determine target folder based on media type
      const folderMap: Record<string, string> = {
        image: "imagen",
        video: "videgen",
        audio: "audgen",
      };

      const targetFolder = folderMap[mediaType as string];
      if (!targetFolder) {
        throw new Error(`Invalid media type: ${mediaType}`);
      }

      // Create target directory
      const targetDir = join(ctx.directory, targetFolder, projectID as string);
      await mkdir(targetDir, { recursive: true });

      // Download the file
      const response = await fetch(mediaUrl as string);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const filePath = join(targetDir, filename as string);
      await writeFile(filePath, Buffer.from(buffer));

      // Log the download in project history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        action: "download",
        mediaType,
        filename,
        source: mediaUrl,
        destination: filePath,
        jobId,
        size: buffer.byteLength,
      };

      // Update project with download info
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

      // Store download reference in phase output
      const phaseOutput = project.phases[currentPhase].output
        ? JSON.parse(project.phases[currentPhase].output || "{}")
        : {};

      if (!phaseOutput.downloads) {
        phaseOutput.downloads = [];
      }

      phaseOutput.downloads.push({
        mediaType,
        filename,
        path: filePath,
        url: mediaUrl,
        jobId,
        size: buffer.byteLength,
        downloadedAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID as string, project);

      return {
        projectId: projectID,
        mediaType,
        filename,
        path: filePath,
        size: buffer.byteLength,
        jobId,
        status: "downloaded",
        message: `Downloaded ${mediaType} to: ${filePath}`,
      };
    },
  };
}
