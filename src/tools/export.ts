import { join } from "node:path";
import { readdir, readFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "../types";
import { isValidProjectId, PHASE_ORDER } from "../constants";

async function collectArtifacts(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectArtifacts(fullPath);
      files.push(...subFiles);
    } else if (
      entry.name.endsWith(".md") ||
      entry.name.endsWith(".json") ||
      entry.name.endsWith(".png") ||
      entry.name.endsWith(".jpg") ||
      entry.name.endsWith(".jpeg") ||
      entry.name.endsWith(".mp4") ||
      entry.name.endsWith(".webm") ||
      entry.name.endsWith(".mp3") ||
      entry.name.endsWith(".wav")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectMedia(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectMedia(fullPath);
      files.push(...subFiles);
    } else if (
      entry.name.endsWith(".png") ||
      entry.name.endsWith(".jpg") ||
      entry.name.endsWith(".jpeg") ||
      entry.name.endsWith(".mp4") ||
      entry.name.endsWith(".webm") ||
      entry.name.endsWith(".mp3") ||
      entry.name.endsWith(".wav")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export function createExportTool(ctx: ToolContext) {
  return {
    name: "brandly_export",
    description:
      "Export a completed Brandly project — collect all artifacts, create a manifest, and optionally copy to a specified output path.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        outputPath: {
          type: "string",
          description:
            "Optional custom output path. Defaults to .brandly/projects/{id}/export/",
        },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, outputPath } = args;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const projectDir = join(ctx.projectsDir, projectID as string);
      const artifactsBase = join(projectDir, "artifacts");
      const exportDir =
        (outputPath as string) || join(projectDir, "export");

      await mkdir(exportDir, { recursive: true });

      const phases = (project.phases as Record<string, any>) || {};
      const artifactFiles: string[] = [];

      // Collect artifacts from each phase
      for (const phase of PHASE_ORDER) {
        const phaseDir = join(artifactsBase, phase);
        const files = await collectArtifacts(phaseDir);
        artifactFiles.push(...files);
      }

      // Copy artifacts to export directory
      for (const src of artifactFiles) {
        const rel = src.replace(artifactsBase, "").replace(/^[/\\]/, "");
        const dest = join(exportDir, rel);
        const destDir = join(dest, "..");
        await mkdir(destDir, { recursive: true });
        await copyFile(src, dest);
      }

      // Collect and copy media files from imagen, videgen, audgen folders
      const mediaFolders = ["imagen", "videgen", "audgen"];
      const mediaFiles: string[] = [];

      for (const folder of mediaFolders) {
        const mediaDir = join(ctx.directory, folder, projectID as string);
        const files = await collectMedia(mediaDir);
        mediaFiles.push(...files);
      }

      // Copy media files to export directory
      for (const src of mediaFiles) {
        // Find which folder this media came from
        const folderMatch = src.match(/\\(imagen|videgen|audgen)\\/);
        const folder = folderMatch ? folderMatch[1] : "media";
        
        const rel = src.replace(join(ctx.directory, folder), "").replace(/^[/\\]/, "");
        const dest = join(exportDir, folder, rel);
        const destDir = join(dest, "..");
        await mkdir(destDir, { recursive: true });
        await copyFile(src, dest);
      }

      const phaseResults: Record<string, any> = {};
      for (const phase of PHASE_ORDER) {
        const p = phases[phase];
        if (p) {
          phaseResults[phase] = {
            status: p.status,
            startedAt: p.startedAt || null,
            completedAt: p.completedAt || null,
          };
        }
      }

      const manifest = {
        projectId: projectID,
        projectName: project.name,
        description: project.description,
        style: project.style,
        shotCount: project.shotCount,
        budget: project.budget,
        spent: project.spent,
        targetPlatforms: project.targetPlatforms,
        createdAt: project.createdAt,
        exportedAt: new Date().toISOString(),
        phases: phaseResults,
        artifacts: artifactFiles.map((f) => f.replace(artifactsBase, "").replace(/^[/\\]/, "")),
        artifactCount: artifactFiles.length,
        mediaFiles: mediaFiles.map((f) => {
          const folderMatch = f.match(/\\(imagen|videgen|audgen)\\/);
          const folder = folderMatch ? folderMatch[1] : "media";
          return f.replace(join(ctx.directory, folder), "").replace(/^[/\\]/, "");
        }),
        mediaCount: mediaFiles.length,
        totalFiles: artifactFiles.length + mediaFiles.length,
      };

      const manifestPath = join(exportDir, "export-manifest.json");
      await ctx.writeAtomic(manifestPath, JSON.stringify(manifest, null, 2));

      return {
        projectId: projectID,
        projectName: project.name,
        exportDir,
        artifactCount: artifactFiles.length,
        mediaCount: mediaFiles.length,
        totalFiles: artifactFiles.length + mediaFiles.length,
        manifest: `export-manifest.json`,
        artifacts: manifest.artifacts,
        mediaFiles: manifest.mediaFiles,
        message: `Exported ${artifactFiles.length} artifacts and ${mediaFiles.length} media files to ${exportDir}`,
      };
    },
  };
}
