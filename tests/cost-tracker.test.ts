import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CostTracker } from "../src/cost-tracker";
import { join } from "node:path";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("CostTracker", () => {
  let testDir: string;
  let tracker: CostTracker;
  let projectId: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `brandly-cost-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    tracker = new CostTracker(testDir);

    // Create a test project with budget
    projectId = randomUUID();
    const projectDir = join(testDir, projectId);
    await mkdir(projectDir, { recursive: true });
    const projectData = {
      id: projectId,
      name: "Test Project",
      budgetCredits: 500,
      creditsSpent: 0,
      costLog: [],
    };
    await writeFile(
      join(projectDir, "project.json"),
      JSON.stringify(projectData, null, 2)
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should check if project can afford costs", async () => {
    const result = await tracker.canAfford(projectId, 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500);
    expect(result.overBudget).toBe(0);
  });

  it("should reject when budget exceeded", async () => {
    const result = await tracker.canAfford(projectId, 600);
    expect(result.allowed).toBe(false);
    expect(result.overBudget).toBe(100);
  });

  it("should record spend and update totals", async () => {
    const result = await tracker.recordSpend(projectId, "trends", "web_search", 10);
    expect(result.newTotal).toBe(10);
    expect(result.remaining).toBe(490);
  });

  it("should throw when recording would exceed budget", async () => {
    await tracker.recordSpend(projectId, "trends", "web_search", 490);
    await expect(
      tracker.recordSpend(projectId, "concept", "image_gen", 20)
    ).rejects.toThrow("Budget exceeded");
  });

  it("should persist costs across instances", async () => {
    await tracker.recordSpend(projectId, "trends", "web_search", 25);

    const newTracker = new CostTracker(testDir);
    const summary = await newTracker.getSummary(projectId);
    expect(summary.total).toBe(25);
  });

  it("should track phase breakdown", async () => {
    await tracker.recordSpend(projectId, "trends", "web_search", 10);
    await tracker.recordSpend(projectId, "trends", "analysis", 5);
    await tracker.recordSpend(projectId, "concept", "image_gen", 20);

    const summary = await tracker.getSummary(projectId);
    expect(summary.byPhase.trends).toBe(15);
    expect(summary.byPhase.concept).toBe(20);
  });
});
