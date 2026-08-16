import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export function createDownloadTool(ctx: ToolContext) {
  return tool({
    description:
      "Download generated media (images, videos, audio) from Higgsfield and save to project folders. Use after asset/audio phases to persist generated files locally.",
    args: {
      projectID: tool.schema.string().describe("The project UUID"),
      mediaType: tool.schema.enum(["image", "video", "audio"]).describe("Type of media to download"),
      mediaUrl: tool.schema.string().describe("URL of the generated media from Higgsfield"),
      filename: tool.schema
        .string()
        .describe("Filename to save as (e.g. 'shot-1.mp4', 'hero.png')"),
      jobId: tool.schema.string().optional().describe("Optional Higgsfield job ID for tracking"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      const folderMap: Record<string, string> = {
        image: "imagen",
        video: "videgen",
        audio: "audgen",
      };

      const targetFolder = folderMap[args.mediaType];
      if (!targetFolder) {
        throw new Error(`Invalid media type: ${args.mediaType}`);
      }

      const targetDir = join(ctx.directory, targetFolder, args.projectID);
      await mkdir(targetDir, { recursive: true });

      const response = await fetch(args.mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const filePath = join(targetDir, args.filename);
      await writeFile(filePath, Buffer.from(buffer));

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

      if (!phaseOutput.downloads) {
        phaseOutput.downloads = [];
      }

      phaseOutput.downloads.push({
        mediaType: args.mediaType,
        filename: args.filename,
        path: filePath,
        url: args.mediaUrl,
        jobId: args.jobId,
        size: buffer.byteLength,
        downloadedAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(args.projectID, project);

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          mediaType: args.mediaType,
          filename: args.filename,
          path: filePath,
          size: buffer.byteLength,
          jobId: args.jobId,
          status: "downloaded",
          message: `Downloaded ${args.mediaType} to: ${filePath}`,
        }),
      };
    },
  });
}
