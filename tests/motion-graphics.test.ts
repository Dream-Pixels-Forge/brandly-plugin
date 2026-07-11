import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createContext } from "../src/tools/context";

describe("brandly_motion_graphics", () => {
  let testDir: string;
  let ctx: ReturnType<typeof createContext>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `brandly-mg-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    ctx = createContext(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  async function makeProject(id: string) {
    await ctx.writeProject(id, {
      id,
      name: "MG Test",
      description: "desc",
      status: "running",
      currentPhase: "asset",
      shotCount: 3,
      spent: 0,
      budget: 500,
      style: "cinematic",
      targetPlatforms: ["tiktok"],
      phases: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  }

  it("creates a preset project", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    const result: any = await tool.execute({ projectID: id, preset: "title-reveal" });

    expect(result.status).toBe("created");
    expect(result.sceneCount).toBeGreaterThan(0);

    const code = await readFile(result.compositionPath, "utf-8");
    expect(code).toContain("export const RemotionComposition");
    expect(code).toContain("useCurrentFrame");
  });

  it("emits each animation variable exactly once (no JSX double-declaration)", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    const result: any = await tool.execute({
      projectID: id,
      preset: "custom",
      scenes: [
        {
          id: "s1",
          duration: 3,
          background: "#000000",
          elements: [
            {
              type: "text",
              x: 10,
              y: 40,
              text: "HELLO",
              color: "#ffffff",
              fontSize: 72,
              animation: { type: "fadeIn", duration: 0.8 },
            },
          ],
        },
      ],
    });

    const code = await readFile(result.compositionPath, "utf-8");
    const matches = code.match(/const el0_0_opacity/g) || [];
    expect(matches.length).toBe(1);
  });

  it("typewriter uses charCount, not an undeclared _text variable", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    const result: any = await tool.execute({
      projectID: id,
      preset: "custom",
      scenes: [
        {
          id: "s1",
          duration: 3,
          background: "#000000",
          elements: [
            {
              type: "text",
              x: 10,
              y: 40,
              text: "TYPE ME",
              fontSize: 72,
              animation: { type: "typewriter", duration: 1.5 },
            },
          ],
        },
      ],
    });

    const code = await readFile(result.compositionPath, "utf-8");
    expect(code).toContain("el0_0_charCount");
    expect(code).toContain('const el0_0_text = "TYPE ME";');
    expect(code).toContain("el0_0_text.slice(0, el0_0_charCount)");
  });

  it("does not emit invalid easing into interpolate for spring", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    const result: any = await tool.execute({
      projectID: id,
      preset: "custom",
      scenes: [
        {
          id: "s1",
          duration: 3,
          background: "#000000",
          elements: [
            {
              type: "text",
              x: 10,
              y: 40,
              text: "SPRING",
              animation: { type: "scaleIn", duration: 0.8, easing: "spring" },
            },
          ],
        },
      ],
    });

    const code = await readFile(result.compositionPath, "utf-8");
    expect(code).not.toContain("easing:");
  });

  it("does not emit invalid easing into interpolate for named easings", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    const result: any = await tool.execute({
      projectID: id,
      preset: "custom",
      scenes: [
        {
          id: "s1",
          duration: 3,
          background: "#000000",
          elements: [
            {
              type: "text",
              x: 10,
              y: 40,
              text: "EASE",
              animation: { type: "fadeIn", duration: 0.8, easing: "easeOut" },
            },
          ],
        },
      ],
    });

    const code = await readFile(result.compositionPath, "utf-8");
    expect(code).not.toContain("easing:");
  });

  it("rejects custom preset without scenes", async () => {
    const id = randomUUID();
    await makeProject(id);

    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    await expect(
      tool.execute({ projectID: id, preset: "custom", scenes: [] })
    ).rejects.toThrow("scenes array is required");
  });

  it("requires a valid project", async () => {
    const { createMotionGraphicsTool } = await import(
      "../src/tools/motion-graphics"
    );
    const tool = createMotionGraphicsTool(ctx);
    await expect(
      tool.execute({ projectID: "bad", preset: "title-reveal" })
    ).rejects.toThrow("Invalid project ID");
  });
});
