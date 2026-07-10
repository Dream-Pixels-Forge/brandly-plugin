import { join } from "node:path";
import { readFile, writeFile, rename, unlink, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export interface UserPreferences {
  preferredStyle?: string;
  targetPlatforms?: string[];
  likedHooks?: string[];
  dislikedHooks?: string[];
  budget?: number;
  lastUsedStyle?: string;
}

export class Memory {
  private data: UserPreferences;
  private memoryPath: string;

  constructor(workspaceDir: string) {
    this.memoryPath = join(workspaceDir, ".brandly", "user-preferences.json");
    this.data = this.load();
  }

  private load(): UserPreferences {
    try {
      if (existsSync(this.memoryPath)) {
        const content = readFileSync(
          this.memoryPath,
          "utf-8"
        );
        return JSON.parse(content);
      }
    } catch {
      // Return empty preferences on error
    }
    return {};
  }

  get(): UserPreferences {
    return { ...this.data };
  }

  exists(): boolean {
    return Object.keys(this.data).length > 0;
  }

  async save(): Promise<void> {
    const dir = join(
      this.memoryPath,
      ".."
    );
    await mkdir(dir, { recursive: true });

    const tempPath = join(
      tmpdir(),
      `brandly-memory-${randomUUID()}.json`
    );

    try {
      await writeFile(tempPath, JSON.stringify(this.data, null, 2), "utf-8");
      await rename(tempPath, this.memoryPath);
    } catch (err) {
      // Clean up temp file on error
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  update(prefs: Partial<UserPreferences>): void {
    this.data = { ...this.data, ...prefs };
  }
}
