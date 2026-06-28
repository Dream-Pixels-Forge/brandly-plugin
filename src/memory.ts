import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface UserPreferences {
  preferredStyle?: string;
  preferredModel?: string;
  preferredDuration?: number;
  likedHooks: string[];
  dislikedHooks: string[];
  avgBudgetUsage: number;
  projectCount: number;
  lastUpdated: string;
}

function getDefaultPrefs(): UserPreferences {
  return {
    likedHooks: [],
    dislikedHooks: [],
    avgBudgetUsage: 0,
    projectCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Persists user preferences across projects.
 * Tracks liked/disliked hooks, preferred style/model, and budget patterns.
 * H2 fix: accepts baseDir instead of using process.cwd()
 * H3 fix: no in-memory cache (was useless since instantiated per call)
 * M6 fix: timestamp set at save time, not module load
 * M8 fix: file is memory.json not user_preferences.json
 */
export class Memory {
  private memoryFile: string;
  private memoryDir: string;

  constructor(baseDir: string) {
    this.memoryDir = baseDir;
    this.memoryFile = join(baseDir, "memory.json");
  }

  async load(): Promise<UserPreferences> {
    try {
      const raw = await readFile(this.memoryFile, "utf-8");
      return JSON.parse(raw);
    } catch {
      return getDefaultPrefs();
    }
  }

  async save(prefs: UserPreferences): Promise<void> {
    prefs.lastUpdated = new Date().toISOString();
    await mkdir(this.memoryDir, { recursive: true });
    await writeFile(this.memoryFile, JSON.stringify(prefs, null, 2));
  }

  async recordProjectCompletion(projectId: string, creditsUsed: number, style: string, model?: string): Promise<void> {
    const prefs = await this.load();
    prefs.projectCount += 1;
    prefs.avgBudgetUsage = (prefs.avgBudgetUsage * (prefs.projectCount - 1) + creditsUsed) / prefs.projectCount;
    prefs.preferredStyle = style;
    if (model) prefs.preferredModel = model;
    await this.save(prefs);
  }

  async likeHook(hook: string): Promise<void> {
    const prefs = await this.load();
    if (!prefs.likedHooks.includes(hook)) {
      prefs.likedHooks.push(hook);
    }
    prefs.dislikedHooks = prefs.dislikedHooks.filter(h => h !== hook);
    await this.save(prefs);
  }

  async dislikeHook(hook: string): Promise<void> {
    const prefs = await this.load();
    if (!prefs.dislikedHooks.includes(hook)) {
      prefs.dislikedHooks.push(hook);
    }
    prefs.likedHooks = prefs.likedHooks.filter(h => h !== hook);
    await this.save(prefs);
  }

  async getPreferences(): Promise<UserPreferences> {
    return this.load();
  }

  async reset(): Promise<void> {
    await this.save(getDefaultPrefs());
  }
}