import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createContext } from "../src/tools/context";

async function createProjectFile(baseDir: string, id: string, statusOrPhases: string | Record<string, any> = "running", phases?: Record<string, any>) {
  const projectDir = join(baseDir, id);
  await mkdir(projectDir, { recursive: true });
  const actualStatus = typeof statusOrPhases === "string" ? statusOrPhases : "running";
  const actualPhases = typeof statusOrPhases === "object" ? statusOrPhases : (phases ?? {});
  const project = {
    id,
    name: "Test Project",
    description: "desc",
    status: actualStatus,
    currentPhase: "script",
    shotCount: 5,
    spent: 0,
    budget: 500,
    style: "cinematic",
    targetPlatforms: ["tiktok"],
    phases: actualPhases,
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(projectDir, "project.json"), JSON.stringify(project, null, 2));
}

describe("brandly_progress", () => {
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

  it("should show 0% for a fresh project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id);

    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result).toMatchObject({
      overallPercent: 0,
      completedPhases: 0,
      totalPhases: 10,
    });
  });

  it("should show correct % after some phases complete", async () => {
    const id = randomUUID();
    const phases = {
      init: { status: "completed", startedAt: "2025-01-01T00:00:00Z", completedAt: "2025-01-01T00:01:00Z" },
      trends: { status: "completed", startedAt: "2025-01-01T00:01:00Z", completedAt: "2025-01-01T00:02:00Z" },
      concept: { status: "completed", startedAt: "2025-01-01T00:02:00Z", completedAt: "2025-01-01T00:03:00Z" },
    };
    await createProjectFile(projectsDir, id, phases);

    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result).toMatchObject({
      overallPercent: 30,
      completedPhases: 3,
      totalPhases: 10,
    });
  });

  it("should handle cancelled project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "cancelled");

    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result.projectStatus).toBe("cancelled");
    expect(result.status).toBe("Project cancelled");
  });

  it("should handle paused project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "paused");

    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    const result = await tool.execute({ projectID: id });

    expect(result.projectStatus).toBe("paused");
    expect(result.status).toBe("Project paused");
  });

  it("should reject invalid project ID", async () => {
    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    await expect(tool.execute({ projectID: "bad" })).rejects.toThrow("Invalid project ID");
  });

  it("should reject non-existent project", async () => {
    const { createProgressTool } = await import("../src/tools/progress");
    const tool = createProgressTool(ctx);
    await expect(tool.execute({ projectID: randomUUID() })).rejects.toThrow("not found");
  });
});
