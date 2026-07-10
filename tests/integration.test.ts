import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import brandlyPlugin from "../src/index";

describe("brandlyPlugin", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `brandly-integration-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });

    // Create agents directory with dummy agent files
    const agentsDir = join(testDir, "agents");
    await mkdir(agentsDir, { recursive: true });
    const agentFiles = [
      "trends_agent.md",
      "concept_agent.md",
      "script_agent.md",
      "asset_agent.md",
      "audio_agent.md",
      "validation_agent.md",
      "publish_agent.md",
    ];
    for (const file of agentFiles) {
      await writeFile(join(agentsDir, file), `# ${file}\nAgent prompt for ${file}`);
    }
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should export all 15 tools", () => {
    const plugin = brandlyPlugin({ directory: testDir });
    expect(plugin.name).toBe("brandly");
    expect(plugin.tools).toHaveLength(15);
  });

  it("should have all required tool names", () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const toolNames = plugin.tools.map((t: any) => t.name);
    expect(toolNames).toContain("brandly_start");
    expect(toolNames).toContain("brandly_status");
    expect(toolNames).toContain("brandly_approve");
    expect(toolNames).toContain("brandly_run_project");
    expect(toolNames).toContain("brandly_estimate");
    expect(toolNames).toContain("brandly_re_edit");
    expect(toolNames).toContain("brandly_validate");
    expect(toolNames).toContain("brandly_memory");
    expect(toolNames).toContain("brandly_analyze_image");
    expect(toolNames).toContain("brandly_record_cost");
    expect(toolNames).toContain("brandly_save_artifact");
    expect(toolNames).toContain("brandly_templates");
    expect(toolNames).toContain("brandly_cancel");
    expect(toolNames).toContain("brandly_progress");
    expect(toolNames).toContain("brandly_export");
  });

  it("should create project with brandly_start", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const startTool = plugin.tools.find((t: any) => t.name === "brandly_start");

    const result = await startTool.execute({
      idea: "A wireless headphone brand",
      productName: "SoundWave Pro",
      style: "cinematic",
      shotCount: 5,
    });

    expect(result.projectId).toBeDefined();
    expect(result.status).toBe("created");

    const projectDir = join(testDir, ".brandly", "projects", result.projectId);
    expect(existsSync(projectDir)).toBe(true);

    const projectJson = join(projectDir, "project.json");
    expect(existsSync(projectJson)).toBe(true);

    const project = JSON.parse(await readFile(projectJson, "utf-8"));
    expect(project.name).toBe("SoundWave Pro");
    expect(project.style).toBe("cinematic");
    expect(project.currentPhase).toBe("init");
  });

  it("should show project status", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const startTool = plugin.tools.find((t: any) => t.name === "brandly_start");
    const statusTool = plugin.tools.find((t: any) => t.name === "brandly_status");

    const { projectId } = await startTool.execute({
      idea: "Test product",
      productName: "Test",
    });

    const status = await statusTool.execute({ projectID: projectId });
    expect(status.projectId).toBe(projectId);
    expect(status.currentPhase).toBe("init");
  });

  it("should approve phase and advance", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const startTool = plugin.tools.find((t: any) => t.name === "brandly_start");
    const approveTool = plugin.tools.find((t: any) => t.name === "brandly_approve");

    const { projectId } = await startTool.execute({
      idea: "Test product",
      productName: "Test",
    });

    const result = await approveTool.execute({
      projectID: projectId,
      phase: "init",
    });

    expect(result.approvedPhase).toBe("init");
    expect(result.nextPhase).toBe("trends");
  });

  it("should dispatch correct agent for phase", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const startTool = plugin.tools.find((t: any) => t.name === "brandly_start");
    const approveTool = plugin.tools.find((t: any) => t.name === "brandly_approve");
    const runTool = plugin.tools.find((t: any) => t.name === "brandly_run_project");

    const { projectId } = await startTool.execute({
      idea: "Test product",
      productName: "Test",
    });

    await approveTool.execute({ projectID: projectId, phase: "init" });

    const result = await runTool.execute({ projectID: projectId });
    expect(result.currentPhase).toBe("trends");
    expect(result.agent).toBe("trends_agent.md");
  });

  it("should dispatch script_agent for re_edit phase", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const startTool = plugin.tools.find((t: any) => t.name === "brandly_start");
    const runTool = plugin.tools.find((t: any) => t.name === "brandly_run_project");

    const { projectId } = await startTool.execute({
      idea: "Test product",
      productName: "Test",
    });

    // Manually set phase to re_edit
    const projectPath = join(
      testDir,
      ".brandly",
      "projects",
      projectId,
      "project.json"
    );
    const project = JSON.parse(await readFile(projectPath, "utf-8"));
    project.currentPhase = "re_edit";
    await writeFile(projectPath, JSON.stringify(project, null, 2));

    const result = await runTool.execute({ projectID: projectId });
    expect(result.agent).toBe("script_agent.md");
  });

  it("should validate project IDs", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const statusTool = plugin.tools.find((t: any) => t.name === "brandly_status");

    await expect(
      statusTool.execute({ projectID: "not-a-uuid" })
    ).rejects.toThrow("Invalid project ID format");
  });

  it("should estimate costs", async () => {
    const plugin = brandlyPlugin({ directory: testDir });
    const estimateTool = plugin.tools.find(
      (t: any) => t.name === "brandly_estimate"
    );

    const result = await estimateTool.execute({
      idea: "Test",
      productName: "Test",
      style: "cinematic",
      shotCount: 5,
    });

    expect(result.style).toBe("cinematic");
    expect(result.totalEstimate).toBeGreaterThan(0);
  });
});
