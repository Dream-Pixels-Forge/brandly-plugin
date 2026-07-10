import { join } from "node:path";
import {
  readFile,
  writeFile,
  readdir,
  rename,
  unlink,
  mkdir,
} from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { ToolContext, ProjectData } from "../types";
import {
  STYLE_COSTS,
  SHOT_COSTS,
  PHASE_ORDER,
  type VideoStyle,
} from "../constants";

function isPathAllowed(filePath: string, projectsDir: string): boolean {
  const resolved = join(projectsDir, "..", filePath);
  return resolved.startsWith(projectsDir) || resolved.startsWith(join(projectsDir, ".."));
}

function getArtifactPaths(projectDir: string, phase: string): string[] {
  const artifactDir = join(projectDir, "artifacts", phase);
  if (!existsSync(artifactDir)) {
    return [];
  }
  return readdirSync(artifactDir)
    .filter((f: string) => f.endsWith(".md") || f.endsWith(".json"))
    .map((f: string) => join(artifactDir, f));
}

function getPhaseCostEstimate(
  style: string,
  shotCount: number,
  currentPhase: string,
  targetPhase: string
): number {
  const styleCost = STYLE_COSTS[style as VideoStyle] || 200;
  const shotCost = SHOT_COSTS[shotCount] || 0;

  const startIdx = PHASE_ORDER.indexOf(currentPhase as any);
  const endIdx = PHASE_ORDER.indexOf(targetPhase as any);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return 0;
  }

  const phasesRemaining = endIdx - startIdx;
  const baseTotal = styleCost + shotCost;
  return Math.round((baseTotal * phasesRemaining) / PHASE_ORDER.length);
}

export function createContext(workspaceDir: string): ToolContext {
  const PROJECTS_DIR = join(workspaceDir, ".brandly", "projects");
  const IMAGES_DIR = join(workspaceDir, ".brandly", "images");
  const ARTIFACTS_DIR = join(workspaceDir, ".brandly", "artifacts");
  const AGENTS_DIR = join(workspaceDir, "agents");

  async function writeAtomic(filePath: string, content: string): Promise<void> {
    const dir = join(filePath, "..");
    await mkdir(dir, { recursive: true });

    const tempPath = join(
      tmpdir(),
      `brandly-${randomUUID()}-${Date.now()}.tmp`
    );

    try {
      await writeFile(tempPath, content, "utf-8");
      await rename(tempPath, filePath);
    } catch (err) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  async function writeProject(
    id: string,
    data: ProjectData
  ): Promise<void> {
    const projectDir = join(PROJECTS_DIR, id);
    await mkdir(projectDir, { recursive: true });
    const filePath = join(projectDir, "project.json");
    await writeAtomic(filePath, JSON.stringify(data, null, 2));
  }

  async function readProject(
    id: string
  ): Promise<ProjectData | null> {
    const filePath = join(PROJECTS_DIR, id, "project.json");
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ProjectData;
  }

  async function listProjects(): Promise<string[]> {
    if (!existsSync(PROJECTS_DIR)) {
      return [];
    }
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  return {
    directory: workspaceDir,
    projectsDir: PROJECTS_DIR,
    imagesDir: IMAGES_DIR,
    artifactsDir: ARTIFACTS_DIR,
    agentsDir: AGENTS_DIR,
    writeAtomic,
    writeProject,
    readProject,
    listProjects,
    isPathAllowed: (p: string) => isPathAllowed(p, PROJECTS_DIR),
    getArtifactPaths: (projectDir: string, phase: string) =>
      getArtifactPaths(projectDir, phase),
    getPhaseCostEstimate,
  };
}
