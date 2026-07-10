import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Memory } from "../src/memory";
import { join } from "node:path";
import { rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("Memory", () => {
  let testDir: string;
  let memory: Memory;

  beforeEach(async () => {
    testDir = join(tmpdir(), `brandly-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    memory = new Memory(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should start with empty preferences", () => {
    expect(memory.exists()).toBe(false);
    expect(memory.get()).toEqual({});
  });

  it("should update preferences", () => {
    memory.update({ preferredStyle: "cinematic" });
    expect(memory.get().preferredStyle).toBe("cinematic");
  });

  it("should save and load preferences", async () => {
    memory.update({ preferredStyle: "ugc", budget: 300 });
    await memory.save();

    const newMemory = new Memory(testDir);
    expect(newMemory.get().preferredStyle).toBe("ugc");
    expect(newMemory.get().budget).toBe(300);
  });

  it("should persist liked hooks", async () => {
    memory.update({ likedHooks: ["hook1"] });
    await memory.save();

    const newMemory = new Memory(testDir);
    expect(newMemory.get().likedHooks).toContain("hook1");
  });

  it("should persist disliked hooks", async () => {
    memory.update({ dislikedHooks: ["bad-hook"] });
    await memory.save();

    const newMemory = new Memory(testDir);
    expect(newMemory.get().dislikedHooks).toContain("bad-hook");
  });
});
