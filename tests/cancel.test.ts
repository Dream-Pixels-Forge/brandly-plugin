import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createContext } from "../src/tools/context";

async function createProjectFile(baseDir: string, id: string, status = "running", phases: Record<string, any> = {}) {
  const projectDir = join(baseDir, id);
  await mkdir(projectDir, { recursive: true });
  const project = {
    id,
    name: "Test Project",
    description: "desc",
    status,
    currentPhase: "init",
    shotCount: 5,
    spent: 0,
    budget: 500,
    style: "cinematic",
    targetPlatforms: ["tiktok"],
    phases,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(projectDir, "project.json"), JSON.stringify(project, null, 2));
}

describe("brandly_cancel", () => {
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

  it("should cancel a running project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "running");

    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    const result = await tool.execute({ projectID: id, action: "cancel" });

    expect(result).toMatchObject({
      projectId: id,
      previousStatus: "running",
      newStatus: "cancelled",
      action: "cancel",
    });

    const proj = JSON.parse(await readFile(join(projectsDir, id, "project.json"), "utf-8"));
    expect(proj.status).toBe("cancelled");
    expect(proj.cancelledAt).toBeDefined();
  });

  it("should pause a running project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "running");

    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    const result = await tool.execute({ projectID: id, action: "pause" });

    expect(result).toMatchObject({ newStatus: "paused", action: "pause" });

    const proj = JSON.parse(await readFile(join(projectsDir, id, "project.json"), "utf-8"));
    expect(proj.status).toBe("paused");
    expect(proj.pausedAt).toBeDefined();
  });

  it("should reject cancelling a completed project", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "completed");

    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    await expect(tool.execute({ projectID: id })).rejects.toThrow("Cannot cancel a completed project");
  });

  it("should reject double-cancelling", async () => {
    const id = randomUUID();
    await createProjectFile(projectsDir, id, "cancelled");

    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    await expect(tool.execute({ projectID: id })).rejects.toThrow("already cancelled");
  });

  it("should reject invalid project ID", async () => {
    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    await expect(tool.execute({ projectID: "bad-id" })).rejects.toThrow("Invalid project ID");
  });

  it("should reject non-existent project", async () => {
    const { createCancelTool } = await import("../src/tools/cancel");
    const tool = createCancelTool(ctx);
    await expect(tool.execute({ projectID: randomUUID() })).rejects.toThrow("not found");
  });
});
