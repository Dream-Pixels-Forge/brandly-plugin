import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { Memory } from "../src/memory";

const TEMP_ROOT = "C:\\Users\\Patrick\\AppData\\Local\\Temp\\opencode";

async function makeTempDir(name: string): Promise<string> {
  const dir = join(TEMP_ROOT, name, crypto.randomUUID());
  await mkdir(dir, { recursive: true });
  return dir;
}

describe("Memory", () => {
  let baseDir: string;
  let memory: Memory;

  beforeEach(async () => {
    baseDir = await makeTempDir("memory-tests");
    memory = new Memory(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  describe("likeHook", () => {
    it("adds a hook to likedHooks", async () => {
      await memory.likeHook("bold-opening");

      const prefs = await memory.getPreferences();
      expect(prefs.likedHooks).toContain("bold-opening");
      expect(prefs.dislikedHooks).not.toContain("bold-opening");
    });

    it("does not duplicate liked hooks", async () => {
      await memory.likeHook("bold-opening");
      await memory.likeHook("bold-opening");

      const prefs = await memory.getPreferences();
      expect(prefs.likedHooks).toEqual(["bold-opening"]);
    });

    it("removes a hook from dislikedHooks when it is liked", async () => {
      await memory.dislikeHook("soft-music");
      await memory.likeHook("soft-music");

      const prefs = await memory.getPreferences();
      expect(prefs.likedHooks).toContain("soft-music");
      expect(prefs.dislikedHooks).not.toContain("soft-music");
    });
  });

  describe("dislikeHook", () => {
    it("adds a hook to dislikedHooks", async () => {
      await memory.dislikeHook("loud-sfx");

      const prefs = await memory.getPreferences();
      expect(prefs.dislikedHooks).toContain("loud-sfx");
      expect(prefs.likedHooks).not.toContain("loud-sfx");
    });

    it("does not duplicate disliked hooks", async () => {
      await memory.dislikeHook("loud-sfx");
      await memory.dislikeHook("loud-sfx");

      const prefs = await memory.getPreferences();
      expect(prefs.dislikedHooks).toEqual(["loud-sfx"]);
    });

    it("removes a hook from likedHooks when it is disliked", async () => {
      await memory.likeHook("fast-cut");
      await memory.dislikeHook("fast-cut");

      const prefs = await memory.getPreferences();
      expect(prefs.dislikedHooks).toContain("fast-cut");
      expect(prefs.likedHooks).not.toContain("fast-cut");
    });
  });

  describe("liked and disliked hooks", () => {
    it("keeps liked and disliked hooks mutually exclusive", async () => {
      await memory.likeHook("a");
      await memory.likeHook("b");
      await memory.dislikeHook("b");
      await memory.dislikeHook("c");
      await memory.likeHook("c");

      const prefs = await memory.getPreferences();
      expect(prefs.likedHooks.sort()).toEqual(["a", "c"]);
      expect(prefs.dislikedHooks).toEqual(["b"]);
    });
  });

  describe("recordProjectCompletion", () => {
    it("increments projectCount and updates preferredStyle", async () => {
      await memory.recordProjectCompletion("proj-1", 500, "cinematic");

      const prefs = await memory.getPreferences();
      expect(prefs.projectCount).toBe(1);
      expect(prefs.preferredStyle).toBe("cinematic");
    });

    it("optionally stores preferredModel", async () => {
      await memory.recordProjectCompletion("proj-2", 300, "ugc", "seedance");

      const prefs = await memory.getPreferences();
      expect(prefs.preferredModel).toBe("seedance");
    });

    it("calculates a rolling average budget usage", async () => {
      await memory.recordProjectCompletion("proj-1", 100, "cinematic");
      expect((await memory.getPreferences()).avgBudgetUsage).toBe(100);

      await memory.recordProjectCompletion("proj-2", 200, "cinematic");
      expect((await memory.getPreferences()).avgBudgetUsage).toBe(150);

      await memory.recordProjectCompletion("proj-3", 300, "cinematic");
      expect((await memory.getPreferences()).avgBudgetUsage).toBe(200);
    });
  });

  describe("reset", () => {
    it("restores default preferences while keeping the file", async () => {
      await memory.likeHook("bold-opening");
      await memory.dislikeHook("loud-sfx");
      await memory.recordProjectCompletion("proj-1", 500, "cinematic", "seedance");

      await memory.reset();

      const prefs = await memory.getPreferences();
      expect(prefs.likedHooks).toEqual([]);
      expect(prefs.dislikedHooks).toEqual([]);
      expect(prefs.avgBudgetUsage).toBe(0);
      expect(prefs.projectCount).toBe(0);
      expect(prefs.preferredStyle).toBeUndefined();
      expect(prefs.preferredModel).toBeUndefined();
      expect(typeof prefs.lastUpdated).toBe("string");
    });
  });
});
