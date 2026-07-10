import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createContext } from "../src/tools/context";

async function createProjectWithArtifacts(baseDir: string, id: string) {
  const projectDir = join(baseDir, id);
  await mkdir(projectDir, { recursive: true });
  const project = {
    id,
    name: "Export Test",
    description: "desc",
    status: "running",
    currentPhase: "script",
    shotCount: 5,
    spent: 0,
    budget: 500,
    style: "cinematic",
    targetPlatforms: ["tiktok"],
    phases: {
      init: { status: "completed", startedAt: "2025-01-01T00:00:00Z", completedAt: "2025-01-01T00:01:00Z" },
      script: { status: "completed", startedAt: "2025-01-01T00:01:00Z", completedAt: "2025-01-01T00:02:00Z" },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(projectDir, "project.json"), JSON.stringify(project, null, 2));
  await mkdir(join(projectDir, "artifacts", "init"), { recursive: true });
  await mkdir(join(projectDir, "artifacts", "script"), { recursive: true });
  await writeFile(join(projectDir, "artifacts", "init", "result.md"), "# Init Result");
  await writeFile(join(projectDir, "artifacts", "script", "script.md"), "# Script");
  await writeFile(join(projectDir, "artifacts", "script", "storyboard.json"), JSON.stringify({ shots: [] }));
}

describe("brandly_export", () => {
  let testDir: string;
  let projectsDir: string;
  let ctx: ReturnType<typeof createContext>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `brandly-test-${randomUUID()}`);
    projectsDir = join(testDir, ".brandly", "projects");
    await mkdir(projectsDir, { recursive: true });
    ctx = createContext(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should export project with manifest", async () => {
    const id = randomUUID();
    await createProjectWithArtifacts(projectsDir, id);

    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result).toMatchObject({
      projectId: id,
      projectName: "Export Test",
      artifactCount: 3,
      manifest: "export-manifest.json",
    });
  });

  it("should create export-manifest.json with correct content", async () => {
    const id = randomUUID();
    await createProjectWithArtifacts(projectsDir, id);

    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    await tool.execute({ projectID: id });

    const exportDir = join(projectsDir, id, "export");
    const manifest = JSON.parse(await readFile(join(exportDir, "export-manifest.json"), "utf-8"));

    expect(manifest.projectId).toBe(id);
    expect(manifest.projectName).toBe("Export Test");
    expect(manifest.artifacts).toHaveLength(3);
    expect(manifest.phases.init.status).toBe("completed");
    expect(manifest.phases.script.status).toBe("completed");
  });

  it("should copy artifacts to export dir", async () => {
    const id = randomUUID();
    await createProjectWithArtifacts(projectsDir, id);

    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    await tool.execute({ projectID: id });

    const exportDir = join(projectsDir, id, "export");
    const files = await readdir(exportDir, { recursive: true }).then((f) => f.map((s) => s.replace(/\\/g, "/")));
    expect(files).toContain("init/result.md");
    expect(files).toContain("script/script.md");
  });

  it("should handle project with no artifacts gracefully", async () => {
    const id = randomUUID();
    const projectDir = join(projectsDir, id);
    await mkdir(projectDir, { recursive: true });
    const project = {
      id, name: "Empty", description: "desc", status: "running",
      currentPhase: "init", shotCount: 3, spent: 0, budget: 200,
      style: "ugc", targetPlatforms: ["instagram"], phases: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await writeFile(join(projectDir, "project.json"), JSON.stringify(project, null, 2));

    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result.artifactCount).toBe(0);
  });

  it("should reject invalid project ID", async () => {
    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    await expect(tool.execute({ projectID: "bad" })).rejects.toThrow("Invalid project ID");
  });

  it("should reject non-existent project", async () => {
    const { createExportTool } = await import("../src/tools/export");
    const tool = createExportTool(ctx);
    await expect(tool.execute({ projectID: randomUUID() })).rejects.toThrow("not found");
  });
});
