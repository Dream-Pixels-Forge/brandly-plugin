import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { CostTracker } from "../src/cost-tracker";

const TEMP_ROOT = "C:\\Users\\Patrick\\AppData\\Local\\Temp\\opencode";

async function makeTempDir(name: string): Promise<string> {
  const dir = join(TEMP_ROOT, name, crypto.randomUUID());
  await mkdir(dir, { recursive: true });
  return dir;
}

async function seedProject(
  projectsDir: string,
  projectId: string,
  budgetCredits: number,
  creditsSpent: number = 0,
  costLog: any[] = []
) {
  const projectDir = join(projectsDir, projectId);
  await mkdir(projectDir, { recursive: true });
  const state = {
    id: projectId,
    budgetCredits,
    creditsSpent,
    costLog,
  };
  await writeFile(join(projectDir, "project.json"), JSON.stringify(state, null, 2));
}

describe("CostTracker", () => {
  let projectsDir: string;
  let tracker: CostTracker;

  beforeEach(async () => {
    projectsDir = await makeTempDir("cost-tracker-tests");
    tracker = new CostTracker(projectsDir);
  });

  afterEach(async () => {
    await rm(projectsDir, { recursive: true, force: true });
  });

  describe("canAfford", () => {
    it("returns allowed=true when the cost is within budget", async () => {
      await seedProject(projectsDir, "proj-1", 1000, 200);

      const result = await tracker.canAfford("proj-1", 300);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(800);
      expect(result.overBudget).toBe(0);
    });

    it("returns allowed=false when the cost exceeds the remaining budget", async () => {
      await seedProject(projectsDir, "proj-2", 1000, 800);

      const result = await tracker.canAfford("proj-2", 300);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(200);
      expect(result.overBudget).toBe(100);
    });

    it("returns allowed=false for a missing project", async () => {
      const result = await tracker.canAfford("does-not-exist", 100);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.overBudget).toBe(100);
    });
  });

  describe("recordSpend", () => {
    it("updates creditsSpent and appends a cost log entry", async () => {
      await seedProject(projectsDir, "proj-3", 1000, 100);

      const result = await tracker.recordSpend("proj-3", "concept", "generate-concept", 250);

      expect(result.newTotal).toBe(350);
      expect(result.remaining).toBe(650);

      const summary = await tracker.getSummary("proj-3");
      expect(summary.total).toBe(350);
      expect(summary.entries).toHaveLength(1);
      expect(summary.entries[0].phase).toBe("concept");
      expect(summary.entries[0].action).toBe("generate-concept");
      expect(summary.entries[0].credits).toBe(250);
      expect(typeof summary.entries[0].timestamp).toBe("string");
    });

    it("throws when recording spend would exceed the budget", async () => {
      await seedProject(projectsDir, "proj-4", 1000, 900);

      expect(tracker.recordSpend("proj-4", "asset", "render", 150)).rejects.toThrow(
        "Budget exceeded!"
      );
    });
  });

  describe("getSummary", () => {
    it("aggregates costs by phase", async () => {
      await seedProject(projectsDir, "proj-5", 2000, 600, [
        { phase: "concept", action: "a", credits: 100, timestamp: "2026-01-01T00:00:00Z" },
        { phase: "concept", action: "b", credits: 200, timestamp: "2026-01-01T00:00:00Z" },
        { phase: "script", action: "c", credits: 300, timestamp: "2026-01-01T00:00:00Z" },
      ]);

      const summary = await tracker.getSummary("proj-5");

      expect(summary.total).toBe(600);
      expect(summary.budget).toBe(2000);
      expect(summary.remaining).toBe(1400);
      expect(summary.percentUsed).toBe(30);
      expect(summary.byPhase).toEqual({
        concept: 300,
        script: 300,
      });
    });

    it("reports 0 percent used when budget is untouched", async () => {
      await seedProject(projectsDir, "proj-6", 500, 0);

      const summary = await tracker.getSummary("proj-6");

      expect(summary.percentUsed).toBe(0);
      expect(summary.byPhase).toEqual({});
    });
  });
});
