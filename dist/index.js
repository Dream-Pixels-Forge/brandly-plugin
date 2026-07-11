// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = import.meta.require;

// src/tools/context.ts
import { join } from "path";
import {
  readFile,
  writeFile,
  readdir,
  rename,
  unlink,
  mkdir
} from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { randomUUID as randomUUID2 } from "crypto";

// src/constants.ts
import { randomUUID } from "crypto";
function generateProjectId() {
  return randomUUID();
}
function isValidProjectId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
var VIDEO_STYLES = [
  "cinematic",
  "ugc",
  "montage",
  "multi_shot",
  "continuous",
  "unboxing",
  "lifestyle"
];
var STYLE_COSTS = {
  cinematic: 250,
  ugc: 150,
  montage: 200,
  multi_shot: 300,
  continuous: 200,
  unboxing: 180,
  lifestyle: 170
};
var SHOT_COSTS = {
  3: 0,
  4: 15,
  5: 30,
  6: 50,
  7: 75,
  8: 100,
  9: 140,
  10: 180
};
var PHASE_ORDER = [
  "init",
  "trends",
  "concept",
  "script",
  "asset",
  "audio",
  "re_edit",
  "validate",
  "publish",
  "done"
];
var PHASE_AGENT_MAP = {
  init: "trends_agent.md",
  trends: "trends_agent.md",
  concept: "concept_agent.md",
  script: "script_agent.md",
  asset: "asset_agent.md",
  audio: "audio_agent.md",
  re_edit: "script_agent.md",
  validate: "validation_agent.md",
  publish: "publish_agent.md",
  done: ""
};

// src/tools/context.ts
function isPathAllowed(filePath, projectsDir) {
  const resolved = join(projectsDir, "..", filePath);
  return resolved.startsWith(projectsDir) || resolved.startsWith(join(projectsDir, ".."));
}
function getArtifactPaths(projectDir, phase) {
  const artifactDir = join(projectDir, "artifacts", phase);
  if (!existsSync(artifactDir)) {
    return [];
  }
  return readdirSync(artifactDir).filter((f) => f.endsWith(".md") || f.endsWith(".json")).map((f) => join(artifactDir, f));
}
function getPhaseCostEstimate(style, shotCount, currentPhase, targetPhase) {
  const styleCost = STYLE_COSTS[style] || 200;
  const shotCost = SHOT_COSTS[shotCount] || 0;
  const startIdx = PHASE_ORDER.indexOf(currentPhase);
  const endIdx = PHASE_ORDER.indexOf(targetPhase);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return 0;
  }
  const phasesRemaining = endIdx - startIdx;
  const baseTotal = styleCost + shotCost;
  return Math.round(baseTotal * phasesRemaining / PHASE_ORDER.length);
}
function createContext(workspaceDir) {
  const PROJECTS_DIR = join(workspaceDir, ".brandly", "projects");
  const IMAGES_DIR = join(workspaceDir, ".brandly", "images");
  const ARTIFACTS_DIR = join(workspaceDir, ".brandly", "artifacts");
  const AGENTS_DIR = join(workspaceDir, "agents");
  async function writeAtomic(filePath, content) {
    const dir = join(filePath, "..");
    await mkdir(dir, { recursive: true });
    const tempPath = join(tmpdir(), `brandly-${randomUUID2()}-${Date.now()}.tmp`);
    try {
      await writeFile(tempPath, content, "utf-8");
      await rename(tempPath, filePath);
    } catch (err) {
      try {
        await unlink(tempPath);
      } catch {}
      throw err;
    }
  }
  async function writeProject(id, data) {
    const projectDir = join(PROJECTS_DIR, id);
    await mkdir(projectDir, { recursive: true });
    const filePath = join(projectDir, "project.json");
    await writeAtomic(filePath, JSON.stringify(data, null, 2));
  }
  async function readProject(id) {
    const filePath = join(PROJECTS_DIR, id, "project.json");
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  }
  async function listProjects() {
    if (!existsSync(PROJECTS_DIR)) {
      return [];
    }
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }
  return {
    directory: workspaceDir,
    projectsDir: PROJECTS_DIR,
    imagesDir: IMAGES_DIR,
    artifactsDir: ARTIFACTS_DIR,
    agentsDir: AGENTS_DIR,
    writeAtomic,
    writeProject,
    readProject,
    listProjects,
    isPathAllowed: (p) => isPathAllowed(p, PROJECTS_DIR),
    getArtifactPaths: (projectDir, phase) => getArtifactPaths(projectDir, phase),
    getPhaseCostEstimate
  };
}

// src/tools/start.ts
import { join as join2 } from "path";
import { mkdir as mkdir2 } from "fs/promises";
import { existsSync as existsSync2 } from "fs";
function createStartTool(ctx) {
  return {
    name: "brandly_start",
    description: "Start a new Brandly video project. Provide a product idea (and optionally an image) to kick off the agent pipeline. Creates a new project directory and returns the project ID.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "Product idea, concept, or brief"
        },
        productName: {
          type: "string",
          description: "Name of the product"
        },
        imagePath: {
          type: "string",
          description: "Optional path to a product image"
        },
        targetPlatforms: {
          type: "array",
          items: { type: "string", enum: ["tiktok", "instagram", "youtube", "all"] },
          default: ["tiktok", "instagram"],
          description: "Target social platforms"
        },
        budgetCredits: {
          type: "number",
          default: 500,
          exclusiveMinimum: 0,
          description: "Max credits to spend on this project"
        },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style preference"
        }
      },
      required: ["idea", "productName"]
    },
    execute: async (args) => {
      const {
        idea,
        productName,
        imagePath,
        targetPlatforms,
        budgetCredits,
        style
      } = args;
      const projectId = generateProjectId();
      const projectDir = join2(ctx.projectsDir, projectId);
      await mkdir2(projectDir, { recursive: true });
      await mkdir2(join2(projectDir, "artifacts"), { recursive: true });
      const project = {
        id: projectId,
        name: productName,
        description: idea,
        status: "pending",
        style: style || "cinematic",
        shotCount: 5,
        budget: budgetCredits || 500,
        spent: 0,
        currentPhase: "init",
        phases: {
          init: { status: "pending" }
        },
        hooks: [],
        settings: [],
        targetPlatforms: targetPlatforms || [
          "tiktok",
          "instagram"
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ctx.writeProject(projectId, project);
      if (typeof imagePath === "string") {
        const imagesDir = join2(ctx.imagesDir, projectId);
        await mkdir2(imagesDir, { recursive: true });
        if (existsSync2(imagePath)) {
          const { copyFile } = await import("fs/promises");
          await copyFile(imagePath, join2(imagesDir, "product.png"));
        }
      }
      return {
        projectId,
        status: "created",
        message: `Project "${productName}" created with ID: ${projectId}`,
        nextPhase: "init"
      };
    }
  };
}

// src/tools/status.ts
function createStatusTool(ctx) {
  return {
    name: "brandly_status",
    description: "Show the current status of a Brandly project \u2014 which phase it's in, budget spent, virality score, and artifacts produced.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const { projectID } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      return {
        projectId: project.id,
        name: project.name,
        status: project.status,
        currentPhase: project.currentPhase,
        budget: project.budget,
        spent: project.spent,
        remaining: project.budget - project.spent,
        phases: project.phases,
        targetPlatforms: project.targetPlatforms,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
    }
  };
}

// src/tools/approve.ts
function createApproveTool(ctx) {
  return {
    name: "brandly_approve",
    description: "Approve the current phase output and advance the pipeline to the next phase. Must be called after each agent completes to proceed.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        phase: {
          type: "string",
          enum: PHASE_ORDER,
          description: "The phase being approved"
        }
      },
      required: ["projectID", "phase"]
    },
    execute: async (args) => {
      const { projectID, phase } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      if (project.status === "cancelled") {
        throw new Error("Cannot approve \u2014 project is cancelled");
      }
      if (project.status === "paused") {
        throw new Error("Cannot approve \u2014 project is paused. Use brandly_cancel to resume first.");
      }
      if (project.status === "completed") {
        throw new Error("Cannot approve \u2014 project is already completed");
      }
      if (project.currentPhase !== phase) {
        throw new Error(`Cannot approve phase "${phase}" \u2014 current phase is "${project.currentPhase}"`);
      }
      const currentIdx = PHASE_ORDER.indexOf(phase);
      const nextPhase = currentIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIdx + 1] : "done";
      const phases = project.phases || {};
      phases[phase] = {
        ...phases[phase] || {},
        status: "completed",
        completedAt: new Date().toISOString()
      };
      phases[nextPhase] = {
        status: "pending",
        startedAt: new Date().toISOString()
      };
      const updatedProject = {
        ...project,
        currentPhase: nextPhase,
        phases,
        updatedAt: new Date().toISOString()
      };
      await ctx.writeProject(projectID, updatedProject);
      return {
        projectId: projectID,
        approvedPhase: phase,
        nextPhase,
        status: "approved",
        message: `Phase "${phase}" approved. Next phase: "${nextPhase}"`
      };
    }
  };
}

// src/tools/run.ts
import { join as join3 } from "path";
import { readFile as readFile2 } from "fs/promises";
import { existsSync as existsSync3 } from "fs";

// src/retry.ts
var DEFAULT_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 1e4,
  onRetry: undefined
};
async function withRetry(fn, opts) {
  const config = { ...DEFAULT_OPTIONS, ...opts };
  let lastError;
  for (let attempt = 0;attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === config.maxRetries) {
        break;
      }
      const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
      if (config.onRetry) {
        config.onRetry(attempt + 1, lastError);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// src/tools/run.ts
function createRunTool(ctx) {
  return {
    name: "brandly_run_project",
    description: "Run the next phase of the Brandly pipeline. Reads the current phase and dispatches the appropriate agent subagent. Call after brandly_approve to advance the pipeline.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const { projectID } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      if (project.status === "cancelled") {
        throw new Error("Cannot run \u2014 project is cancelled");
      }
      if (project.status === "paused") {
        throw new Error("Cannot run \u2014 project is paused");
      }
      const currentPhase = project.currentPhase;
      const agentFile = PHASE_AGENT_MAP[currentPhase];
      if (!agentFile) {
        return {
          projectId: projectID,
          status: "completed",
          message: "All phases completed"
        };
      }
      const agentPath = join3(ctx.agentsDir, agentFile);
      if (!existsSync3(agentPath)) {
        throw new Error(`Agent not found: ${agentFile}`);
      }
      const agentPrompt = await withRetry(() => readFile2(agentPath, "utf-8"), {
        maxRetries: 2,
        baseDelayMs: 500,
        onRetry: (attempt, err) => {}
      });
      return {
        projectId: projectID,
        currentPhase,
        agent: agentFile,
        agentPrompt,
        status: "dispatched",
        message: `Dispatched ${agentFile} for phase "${currentPhase}"`
      };
    }
  };
}

// src/tools/estimate.ts
function createEstimateTool(ctx) {
  return {
    name: "brandly_estimate",
    description: "Estimate credit cost before starting a Brandly project. Shows a breakdown by phase so you can decide on budget.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "Product idea"
        },
        productName: {
          type: "string",
          description: "Product name"
        },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style"
        },
        shotCount: {
          type: "number",
          default: 5,
          minimum: 3,
          maximum: 10,
          description: "Number of shots"
        }
      },
      required: ["idea", "productName"]
    },
    execute: async (args) => {
      const { style, shotCount } = args;
      const s = style || "cinematic";
      const shots = shotCount || 5;
      const styleCost = STYLE_COSTS[s] || 200;
      const shotCost = SHOT_COSTS[shots] || 0;
      const totalBase = styleCost + shotCost;
      return {
        style: s,
        shotCount: shots,
        breakdown: {
          styleCost,
          shotCost,
          totalBase
        },
        phaseEstimates: {
          init: 0,
          trends: 10,
          concept: Math.round(totalBase * 0.15),
          script: Math.round(totalBase * 0.2),
          asset: Math.round(totalBase * 0.25),
          audio: Math.round(totalBase * 0.15),
          re_edit: 20,
          validate: 10,
          publish: 5
        },
        totalEstimate: totalBase + 60,
        recommendation: `A ${s} style with ${shots} shots will cost approximately ${totalBase + 60} credits.`
      };
    }
  };
}

// src/tools/re_edit.ts
function createReEditTool(ctx) {
  return {
    name: "brandly_re_edit",
    description: "Re-edit a specific shot in the project. Provide the shot ID and a new prompt/description. The pipeline will regenerate that shot.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        shotId: {
          type: "number",
          description: "The shot ID to re-edit"
        },
        newPrompt: {
          type: "string",
          description: "New prompt for the shot"
        },
        reason: {
          type: "string",
          description: "Why you're re-editing this shot"
        }
      },
      required: ["projectID", "shotId", "newPrompt", "reason"]
    },
    execute: async (args) => {
      const { projectID, shotId, newPrompt, reason } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const agentFile = "script_agent.md";
      return {
        projectId: projectID,
        shotId,
        newPrompt,
        reason,
        agent: agentFile,
        status: "re_editing",
        message: `Re-editing shot ${shotId}: ${reason}`
      };
    }
  };
}

// src/tools/validate.ts
function createValidateTool(ctx) {
  return {
    name: "brandly_validate",
    description: "Run virality validation on the final video. Calls Higgsfield virality predictor to score the video and suggest improvements. Updates the project's viralityScore in state.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        videoPath: {
          type: "string",
          description: "Path to the rendered video"
        }
      },
      required: ["projectID", "videoPath"]
    },
    execute: async (args) => {
      const { projectID, videoPath } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      if (project.status === "cancelled") {
        throw new Error("Cannot validate \u2014 project is cancelled");
      }
      return {
        projectId: projectID,
        videoPath,
        status: "validating",
        message: "Virality validation initiated"
      };
    }
  };
}

// src/memory.ts
import { join as join4 } from "path";
import { writeFile as writeFile3, rename as rename2, unlink as unlink2, mkdir as mkdir3 } from "fs/promises";
import { existsSync as existsSync4, readFileSync } from "fs";
import { tmpdir as tmpdir2 } from "os";
import { randomUUID as randomUUID3 } from "crypto";

class Memory {
  data;
  memoryPath;
  constructor(workspaceDir) {
    this.memoryPath = join4(workspaceDir, ".brandly", "user-preferences.json");
    this.data = this.load();
  }
  load() {
    try {
      if (existsSync4(this.memoryPath)) {
        const content = readFileSync(this.memoryPath, "utf-8");
        return JSON.parse(content);
      }
    } catch {}
    return {};
  }
  get() {
    return { ...this.data };
  }
  exists() {
    return Object.keys(this.data).length > 0;
  }
  async save() {
    const dir = join4(this.memoryPath, "..");
    await mkdir3(dir, { recursive: true });
    const tempPath = join4(tmpdir2(), `brandly-memory-${randomUUID3()}.json`);
    try {
      await writeFile3(tempPath, JSON.stringify(this.data, null, 2), "utf-8");
      await rename2(tempPath, this.memoryPath);
    } catch (err) {
      try {
        await unlink2(tempPath);
      } catch {}
      throw err;
    }
  }
  update(prefs) {
    this.data = { ...this.data, ...prefs };
  }
}

// src/tools/memory.ts
function createMemoryTool(ctx) {
  const memory = new Memory(ctx.directory);
  return {
    name: "brandly_memory",
    description: "View or update your Brandly preferences. Like/dislike hooks, set preferred style, or reset memory.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["view", "like_hook", "dislike_hook", "reset"],
          description: "Action to perform"
        },
        hook: {
          type: "string",
          description: "Hook text to like or dislike"
        }
      },
      required: ["action"]
    },
    execute: async (args) => {
      const { action, hook } = args;
      switch (action) {
        case "view": {
          const prefs = memory.get();
          return {
            exists: memory.exists(),
            preferences: prefs,
            message: memory.exists() ? "Loaded existing preferences" : "No preferences found"
          };
        }
        case "like_hook": {
          if (!hook)
            throw new Error("Hook text required");
          const current = memory.get();
          const liked = current.likedHooks || [];
          if (!liked.includes(hook)) {
            liked.push(hook);
          }
          const disliked = (current.dislikedHooks || []).filter((h) => h !== hook);
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return { liked: hook, message: `Liked hook: "${hook}"` };
        }
        case "dislike_hook": {
          if (!hook)
            throw new Error("Hook text required");
          const current = memory.get();
          const disliked = current.dislikedHooks || [];
          if (!disliked.includes(hook)) {
            disliked.push(hook);
          }
          const liked = (current.likedHooks || []).filter((h) => h !== hook);
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return { disliked: hook, message: `Disliked hook: "${hook}"` };
        }
        case "reset": {
          memory.update({
            likedHooks: [],
            dislikedHooks: [],
            preferredStyle: undefined,
            lastUsedStyle: undefined
          });
          await memory.save();
          return { message: "Memory reset" };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  };
}

// src/tools/image.ts
function createImageTool(ctx) {
  return {
    name: "brandly_analyze_image",
    description: "Deep-analyze any image \u2014 extracts subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction. Returns structured JSON that feeds every downstream agent. Use on any input image before starting a project.",
    parameters: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description: "URL, local file path, or media_id of the image to analyze"
        },
        projectID: {
          type: "string",
          description: "Optional project UUID \u2014 if provided, stores analysis in project state"
        },
        context: {
          type: "string",
          description: "Optional user brief or product idea to help frame the analysis"
        }
      },
      required: ["imagePath"]
    },
    execute: async (args) => {
      const { imagePath, projectID, context } = args;
      if (!imagePath) {
        throw new Error("imagePath is required");
      }
      if (projectID) {
        const project = await ctx.readProject(projectID);
        if (project) {
          project.imageAnalysis = {
            path: imagePath,
            context,
            analyzedAt: new Date().toISOString()
          };
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(projectID, project);
        }
      }
      return {
        imagePath,
        projectID,
        status: "analyzed",
        message: `Image analysis initiated for: ${imagePath}`
      };
    }
  };
}

// src/tools/cost.ts
class BudgetExceededError extends Error {
  constructor(spent, budget) {
    super(`Budget exceeded: ${spent} spent of ${budget} budget`);
    this.name = "BudgetExceededError";
  }
}
function createCostTool(ctx) {
  return {
    name: "brandly_record_cost",
    description: "Record actual credit spend for a phase operation. Call this after any MCP generation tool completes to track real costs against the project budget.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        phase: {
          type: "string",
          description: "Pipeline phase that incurred the cost"
        },
        action: {
          type: "string",
          description: "What the credits were spent on"
        },
        credits: {
          type: "number",
          exclusiveMinimum: 0,
          description: "Credits spent"
        }
      },
      required: ["projectID", "phase", "action", "credits"]
    },
    execute: async (args) => {
      const { projectID, phase, action, credits } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const newSpent = project.spent + credits;
      if (newSpent > project.budget) {
        throw new BudgetExceededError(newSpent, project.budget);
      }
      project.spent = newSpent;
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);
      return {
        projectId: projectID,
        phase,
        action,
        credits,
        totalSpent: newSpent,
        budget: project.budget,
        remaining: project.budget - newSpent,
        status: "recorded"
      };
    }
  };
}

// src/tools/artifact.ts
import { join as join5 } from "path";
import { mkdir as mkdir4 } from "fs/promises";
function createArtifactTool(ctx) {
  return {
    name: "brandly_save_artifact",
    description: "Save a subagent's output to the .brandly project folder. Call this after a subagent completes to persist its markdown/json output for reusability.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        category: {
          type: "string",
          enum: ["analysis", "script", "storyboard", "assets", "audio"],
          description: "Artifact category folder in .brandly/projects/{id}/"
        },
        filename: {
          type: "string",
          description: "Filename to save as (e.g. 'script.md', 'asset-plan.json')"
        },
        content: {
          type: "string",
          description: "The text content to save"
        }
      },
      required: ["projectID", "category", "filename", "content"]
    },
    execute: async (args) => {
      const { projectID, category, filename, content } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const projectDir = join5(ctx.projectsDir, projectID);
      const artifactDir = join5(projectDir, "artifacts", category);
      await mkdir4(artifactDir, { recursive: true });
      const filePath = join5(artifactDir, filename);
      await ctx.writeAtomic(filePath, content);
      return {
        projectId: projectID,
        category,
        filename,
        path: filePath,
        status: "saved",
        message: `Artifact saved: ${category}/${filename}`
      };
    }
  };
}

// src/tools/templates.ts
import { readdirSync as readdirSync2, readFileSync as readFileSync2 } from "fs";
import { join as join6 } from "path";
function createTemplatesTool(ctx) {
  return {
    name: "brandly_templates",
    description: "List available Brandly video style templates with details. Returns template names, descriptions, and usage guidance.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description: "Optional template name to get details for (cinematic, ugc, montage). If omitted, lists all templates."
        }
      }
    },
    execute: async (args) => {
      const { template } = args;
      const templatesDir = join6(ctx.directory, "templates");
      try {
        const files = readdirSync2(templatesDir).filter((f) => f.endsWith(".json"));
        if (files.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No templates found. The templates directory is empty."
              }
            ]
          };
        }
        const templateNames = files.map((f) => f.replace(".json", ""));
        if (template) {
          const requested = template.toLowerCase();
          if (!templateNames.includes(requested)) {
            return {
              content: [
                {
                  type: "text",
                  text: `Template "${requested}" not found. Available: ${templateNames.join(", ")}`
                }
              ]
            };
          }
          const filePath = join6(templatesDir, `${requested}.json`);
          const content = JSON.parse(readFileSync2(filePath, "utf-8"));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  name: content.name,
                  description: content.description,
                  style: content.style,
                  duration: content.duration,
                  hooks: content.hooks,
                  narrative: content.narrative,
                  camera: content.camera,
                  lighting: content.lighting,
                  music: content.music,
                  platforms: content.platforms
                }, null, 2)
              }
            ]
          };
        }
        const summaries = templateNames.map((name) => {
          const filePath = join6(templatesDir, `${name}.json`);
          const content = JSON.parse(readFileSync2(filePath, "utf-8"));
          return {
            name: content.name,
            description: content.description,
            style: content.style,
            optimalDuration: content.duration?.optimal,
            hooks: content.hooks?.slice(0, 2)
          };
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                availableTemplates: summaries,
                usage: "Call brandly_templates(template='cinematic') for full details on a specific template."
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading templates: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ]
        };
      }
    }
  };
}

// src/tools/cancel.ts
function createCancelTool(ctx) {
  return {
    name: "brandly_cancel",
    description: "Pause or cancel a running Brandly project. Paused projects can be resumed later; cancelled projects are permanently stopped. Cannot be undone once cancelled.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        action: {
          type: "string",
          enum: ["pause", "cancel"],
          default: "cancel",
          description: "Whether to pause (reversible) or cancel (permanent)"
        },
        reason: {
          type: "string",
          description: "Optional reason for pausing/cancelling"
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const { projectID, action, reason } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const currentStatus = project.status;
      if (currentStatus === "cancelled") {
        throw new Error("Project is already cancelled");
      }
      if (currentStatus === "completed") {
        throw new Error("Cannot cancel a completed project");
      }
      const newStatus = action === "pause" ? "paused" : "cancelled";
      const updatedProject = {
        ...project,
        status: newStatus,
        ...action === "cancel" ? { cancelledAt: new Date().toISOString() } : {},
        ...action === "pause" ? { pausedAt: new Date().toISOString() } : {},
        ...reason ? { cancelReason: reason } : {},
        updatedAt: new Date().toISOString()
      };
      await ctx.writeProject(projectID, updatedProject);
      return {
        projectId: projectID,
        previousStatus: currentStatus,
        newStatus,
        action,
        reason: reason || null,
        message: action === "pause" ? `Project paused. Use brandly_approve to resume.` : `Project cancelled permanently.`
      };
    }
  };
}

// src/tools/progress.ts
function createProgressTool(ctx) {
  return {
    name: "brandly_progress",
    description: "Show progress of a Brandly project \u2014 overall % complete, phase-by-phase status, time in current phase, and estimated time remaining.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const { projectID } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const phases = project.phases || {};
      const totalPhases = PHASE_ORDER.length;
      const completedPhases = PHASE_ORDER.filter((p) => phases[p]?.status === "completed").length;
      const overallPercent = Math.round(completedPhases / totalPhases * 100);
      const currentPhase = project.currentPhase;
      const currentPhaseData = phases[currentPhase];
      let timeInCurrentPhase = null;
      if (currentPhaseData?.startedAt) {
        const elapsed = Date.now() - new Date(currentPhaseData.startedAt).getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor(elapsed % 60000 / 1000);
        timeInCurrentPhase = `${minutes}m ${seconds}s`;
      }
      const remaining = PHASE_ORDER.filter((p) => !phases[p] || phases[p].status === "pending").length;
      const avgPhaseTime = completedPhases > 0 ? (() => {
        const completed = PHASE_ORDER.filter((p) => phases[p]?.status === "completed" && phases[p]?.startedAt && phases[p]?.completedAt);
        if (completed.length === 0)
          return null;
        const totalTime = completed.reduce((sum, p) => {
          const start = new Date(phases[p].startedAt).getTime();
          const end = new Date(phases[p].completedAt).getTime();
          return sum + (end - start);
        }, 0);
        return Math.round(totalTime / completed.length);
      })() : null;
      let estimatedRemaining = null;
      if (avgPhaseTime && remaining > 0) {
        const estMs = avgPhaseTime * remaining;
        const estMin = Math.floor(estMs / 60000);
        const estSec = Math.floor(estMs % 60000 / 1000);
        estimatedRemaining = `~${estMin}m ${estSec}s`;
      }
      const phaseStatuses = {};
      for (const p of PHASE_ORDER) {
        phaseStatuses[p] = phases[p]?.status || "pending";
      }
      return {
        projectId: projectID,
        projectStatus: project.status,
        currentPhase,
        overallPercent,
        completedPhases,
        totalPhases,
        phases: phaseStatuses,
        timeInCurrentPhase,
        estimatedRemaining,
        status: project.status === "cancelled" ? "Project cancelled" : project.status === "paused" ? "Project paused" : project.status === "completed" ? "All phases complete" : `Phase ${completedPhases}/${totalPhases} (${overallPercent}%)`
      };
    }
  };
}

// src/tools/export.ts
import { join as join7 } from "path";
import { readdir as readdir2, mkdir as mkdir5, copyFile } from "fs/promises";
import { existsSync as existsSync5 } from "fs";
async function collectArtifacts(dir) {
  if (!existsSync5(dir))
    return [];
  const entries = await readdir2(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join7(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectArtifacts(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".json") || entry.name.endsWith(".png") || entry.name.endsWith(".jpg") || entry.name.endsWith(".jpeg") || entry.name.endsWith(".mp4") || entry.name.endsWith(".webm") || entry.name.endsWith(".mp3") || entry.name.endsWith(".wav")) {
      files.push(fullPath);
    }
  }
  return files;
}
async function collectMedia(dir) {
  if (!existsSync5(dir))
    return [];
  const entries = await readdir2(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join7(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectMedia(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".png") || entry.name.endsWith(".jpg") || entry.name.endsWith(".jpeg") || entry.name.endsWith(".mp4") || entry.name.endsWith(".webm") || entry.name.endsWith(".mp3") || entry.name.endsWith(".wav")) {
      files.push(fullPath);
    }
  }
  return files;
}
function createExportTool(ctx) {
  return {
    name: "brandly_export",
    description: "Export a completed Brandly project \u2014 collect all artifacts, create a manifest, and optionally copy to a specified output path.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        outputPath: {
          type: "string",
          description: "Optional custom output path. Defaults to .brandly/projects/{id}/export/"
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const { projectID, outputPath } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const projectDir = join7(ctx.projectsDir, projectID);
      const artifactsBase = join7(projectDir, "artifacts");
      const exportDir = outputPath || join7(projectDir, "export");
      await mkdir5(exportDir, { recursive: true });
      const phases = project.phases || {};
      const artifactFiles = [];
      for (const phase of PHASE_ORDER) {
        const phaseDir = join7(artifactsBase, phase);
        const files = await collectArtifacts(phaseDir);
        artifactFiles.push(...files);
      }
      for (const src of artifactFiles) {
        const rel = src.replace(artifactsBase, "").replace(/^[/\\]/, "");
        const dest = join7(exportDir, rel);
        const destDir = join7(dest, "..");
        await mkdir5(destDir, { recursive: true });
        await copyFile(src, dest);
      }
      const mediaFolders = ["imagen", "videgen", "audgen"];
      const mediaFiles = [];
      for (const folder of mediaFolders) {
        const mediaDir = join7(ctx.directory, folder, projectID);
        const files = await collectMedia(mediaDir);
        mediaFiles.push(...files);
      }
      for (const src of mediaFiles) {
        const folderMatch = src.match(/\\(imagen|videgen|audgen)\\/);
        const folder = folderMatch ? folderMatch[1] : "media";
        const rel = src.replace(join7(ctx.directory, folder), "").replace(/^[/\\]/, "");
        const dest = join7(exportDir, folder, rel);
        const destDir = join7(dest, "..");
        await mkdir5(destDir, { recursive: true });
        await copyFile(src, dest);
      }
      const phaseResults = {};
      for (const phase of PHASE_ORDER) {
        const p = phases[phase];
        if (p) {
          phaseResults[phase] = {
            status: p.status,
            startedAt: p.startedAt || null,
            completedAt: p.completedAt || null
          };
        }
      }
      const manifest = {
        projectId: projectID,
        projectName: project.name,
        description: project.description,
        style: project.style,
        shotCount: project.shotCount,
        budget: project.budget,
        spent: project.spent,
        targetPlatforms: project.targetPlatforms,
        createdAt: project.createdAt,
        exportedAt: new Date().toISOString(),
        phases: phaseResults,
        artifacts: artifactFiles.map((f) => f.replace(artifactsBase, "").replace(/^[/\\]/, "")),
        artifactCount: artifactFiles.length,
        mediaFiles: mediaFiles.map((f) => {
          const folderMatch = f.match(/\\(imagen|videgen|audgen)\\/);
          const folder = folderMatch ? folderMatch[1] : "media";
          return f.replace(join7(ctx.directory, folder), "").replace(/^[/\\]/, "");
        }),
        mediaCount: mediaFiles.length,
        totalFiles: artifactFiles.length + mediaFiles.length
      };
      const manifestPath = join7(exportDir, "export-manifest.json");
      await ctx.writeAtomic(manifestPath, JSON.stringify(manifest, null, 2));
      return {
        projectId: projectID,
        projectName: project.name,
        exportDir,
        artifactCount: artifactFiles.length,
        mediaCount: mediaFiles.length,
        totalFiles: artifactFiles.length + mediaFiles.length,
        manifest: `export-manifest.json`,
        artifacts: manifest.artifacts,
        mediaFiles: manifest.mediaFiles,
        message: `Exported ${artifactFiles.length} artifacts and ${mediaFiles.length} media files to ${exportDir}`
      };
    }
  };
}

// src/tools/download.ts
import { join as join8 } from "path";
import { mkdir as mkdir6, writeFile as writeFile4 } from "fs/promises";
function createDownloadTool(ctx) {
  return {
    name: "brandly_download",
    description: "Download generated media (images, videos, audio) from Higgsfield and save to project folders. Use after asset/audio phases to persist generated files locally.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        mediaType: {
          type: "string",
          enum: ["image", "video", "audio"],
          description: "Type of media to download"
        },
        mediaUrl: {
          type: "string",
          description: "URL of the generated media from Higgsfield"
        },
        filename: {
          type: "string",
          description: "Filename to save as (e.g. 'shot-1.mp4', 'hero.png')"
        },
        jobId: {
          type: "string",
          description: "Optional Higgsfield job ID for tracking"
        }
      },
      required: ["projectID", "mediaType", "mediaUrl", "filename"]
    },
    execute: async (args) => {
      const { projectID, mediaType, mediaUrl, filename, jobId } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const folderMap = {
        image: "imagen",
        video: "videgen",
        audio: "audgen"
      };
      const targetFolder = folderMap[mediaType];
      if (!targetFolder) {
        throw new Error(`Invalid media type: ${mediaType}`);
      }
      const targetDir = join8(ctx.directory, targetFolder, projectID);
      await mkdir6(targetDir, { recursive: true });
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const filePath = join8(targetDir, filename);
      await writeFile4(filePath, Buffer.from(buffer));
      const historyEntry = {
        timestamp: new Date().toISOString(),
        action: "download",
        mediaType,
        filename,
        source: mediaUrl,
        destination: filePath,
        jobId,
        size: buffer.byteLength
      };
      if (!project.phases) {
        project.phases = {};
      }
      const currentPhase = project.currentPhase;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString()
        };
      }
      const phaseOutput = project.phases[currentPhase].output ? JSON.parse(project.phases[currentPhase].output || "{}") : {};
      if (!phaseOutput.downloads) {
        phaseOutput.downloads = [];
      }
      phaseOutput.downloads.push({
        mediaType,
        filename,
        path: filePath,
        url: mediaUrl,
        jobId,
        size: buffer.byteLength,
        downloadedAt: new Date().toISOString()
      });
      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);
      return {
        projectId: projectID,
        mediaType,
        filename,
        path: filePath,
        size: buffer.byteLength,
        jobId,
        status: "downloaded",
        message: `Downloaded ${mediaType} to: ${filePath}`
      };
    }
  };
}

// src/tools/provider.ts
var AVAILABLE_PROVIDERS = [
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    description: "Comprehensive AI generation platform with image, video, 3D, and audio models",
    capabilities: ["image", "video", "3d", "audio", "marketing", "virality"],
    models: [
      "GPT Image 2",
      "Seedance 2.0",
      "Kling 3.0",
      "Soul 2.0",
      "Cinema Studio Video 3.0",
      "Marketing Studio",
      "Virality Predictor"
    ],
    bestFor: [
      "High-fidelity product shots",
      "Branded marketing videos",
      "Character consistency",
      "Virality scoring",
      "Marketing Studio ads"
    ],
    mcpTool: "higgsfield"
  },
  {
    id: "kling",
    name: "Kling AI (\u53EF\u7075)",
    description: "Chinese AI video generation platform with strong motion and physics",
    capabilities: ["image", "video"],
    models: [
      "Kling 3.0",
      "Kling 3.0 Omni",
      "Kling 2.6"
    ],
    bestFor: [
      "Realistic human motion",
      "Multi-character scenes",
      "Budget-friendly video",
      "Chinese market content"
    ],
    cliCommand: "kling"
  },
  {
    id: "openart",
    name: "OpenArt",
    description: "Community AI art platform with diverse models and styles",
    capabilities: ["image", "video"],
    models: [
      "Stable Diffusion",
      "DALL-E",
      "Midjourney",
      "Various community models"
    ],
    bestFor: [
      "Artistic and creative styles",
      "Community models",
      "Experimental aesthetics",
      "Budget-friendly generation"
    ]
  },
  {
    id: "magnific",
    name: "Magnific AI",
    description: "AI image upscaling and enhancement platform",
    capabilities: ["image", "upscale", "enhance"],
    models: [
      "Magnific Upscaler",
      "Magnific Enhancer"
    ],
    bestFor: [
      "Image upscaling",
      "Quality enhancement",
      "Resolution improvement",
      "Detail restoration"
    ]
  },
  {
    id: "runway",
    name: "Runway ML",
    description: "Professional AI video generation and editing platform",
    capabilities: ["video", "image"],
    models: [
      "Gen-4.5",
      "Gen-3 Alpha",
      "Act-Two"
    ],
    bestFor: [
      "Cinematic video quality",
      "Character performance",
      "Professional editing",
      "Film-grade output"
    ]
  },
  {
    id: "pika",
    name: "Pika Labs",
    description: "Creative AI video generation with stylized effects",
    capabilities: ["video", "image"],
    models: [
      "Pika 2.5",
      "Pika 2.0"
    ],
    bestFor: [
      "Stylized and experimental",
      "Creative effects",
      "Social media content",
      "Quick iterations"
    ]
  }
];
function createProviderTool(ctx) {
  return {
    name: "brandly_select_provider",
    description: "Select the AI generation provider for the Brandly pipeline. Shows available providers and lets the user choose their preferred platform for image/video generation.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID (optional \u2014 if provided, saves provider preference to project)"
        },
        providerId: {
          type: "string",
          enum: AVAILABLE_PROVIDERS.map((p) => p.id),
          description: "Provider ID to select (if known). If not provided, shows available providers."
        },
        listOnly: {
          type: "boolean",
          description: "If true, only lists available providers without selecting one"
        }
      },
      required: []
    },
    execute: async (args) => {
      const { projectID, providerId, listOnly } = args;
      if (listOnly || !providerId) {
        const providers = AVAILABLE_PROVIDERS.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          capabilities: p.capabilities,
          models: p.models.slice(0, 5),
          bestFor: p.bestFor.slice(0, 3)
        }));
        return {
          status: "listed",
          providers,
          message: `Found ${providers.length} available providers. Select one by ID.`,
          recommendation: getProviderRecommendation()
        };
      }
      const provider = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${providerId}`);
      }
      if (projectID) {
        const project = await ctx.readProject(projectID);
        if (project) {
          if (!project.phases) {
            project.phases = {};
          }
          const currentPhase = project.currentPhase;
          if (!project.phases[currentPhase]) {
            project.phases[currentPhase] = {
              status: "running",
              startedAt: new Date().toISOString()
            };
          }
          const phaseOutput = project.phases[currentPhase].output ? JSON.parse(project.phases[currentPhase].output || "{}") : {};
          phaseOutput.selectedProvider = {
            id: provider.id,
            name: provider.name,
            selectedAt: new Date().toISOString()
          };
          project.phases[currentPhase].output = JSON.stringify(phaseOutput);
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(projectID, project);
        }
      }
      return {
        projectId: projectID,
        provider: {
          id: provider.id,
          name: provider.name,
          description: provider.description,
          capabilities: provider.capabilities,
          models: provider.models,
          bestFor: provider.bestFor,
          cliCommand: provider.cliCommand,
          mcpTool: provider.mcpTool
        },
        status: "selected",
        message: `Selected ${provider.name} for media generation`,
        usage: getProviderUsage(provider)
      };
    }
  };
}
function getProviderRecommendation() {
  return `
**Recommendation Guide:**

\u2022 **For product videos/ads** \u2192 Higgsfield (Marketing Studio) or Runway (Gen-4.5)
\u2022 **For character consistency** \u2192 Higgsfield (Soul 2.0) or Kling (Omni)
\u2022 **For budget-friendly** \u2192 Kling 3.0 or OpenArt
\u2022 **For cinematic quality** \u2192 Runway (Gen-4.5) or Higgsfield (Cinema Studio)
\u2022 **For Chinese market** \u2192 Kling AI (\u53EF\u7075)
\u2022 **For image upscaling** \u2192 Magnific AI
\u2022 **For experimental/creative** \u2192 Pika or OpenArt
\u2022 **For virality scoring** \u2192 Higgsfield (Virality Predictor)
`;
}
function getProviderUsage(provider) {
  switch (provider.id) {
    case "higgsfield":
      return `
**Higgsfield Usage:**
\`\`\`bash
# Image generation
higgsfield generate create gpt_image_2 --prompt "..." --wait

# Video generation
higgsfield generate create seedance_2_0 --prompt "..." --duration 12 --wait

# Marketing video
higgsfield generate create marketing_studio_video --prompt "..." --mode ugc --wait

# Virality scoring
higgsfield generate create brain_activity --video ./video.mp4 --wait
\`\`\`
`;
    case "kling":
      return `
**Kling Usage:**
\`\`\`bash
# Login first
kling login

# Check capabilities
kling who_am_i

# Image generation
kling text_to_image --model <model> "prompt"

# Video generation
kling text_to_video --model <model> --duration 5 "prompt"

# Image to video
kling image_to_video --model <model> --image ./image.png "prompt"
\`\`\`
`;
    case "openart":
      return `
**OpenArt Usage:**
Visit https://openart.ai and use their web interface or API.
Supports Stable Diffusion, DALL-E, Midjourney, and community models.
`;
    case "magnific":
      return `
**Magnific Usage:**
Visit https://magnific.ai and use their web interface or API.
Specialized for image upscaling and enhancement.
`;
    case "runway":
      return `
**Runway Usage:**
Visit https://runwayml.com and use their web interface or API.
Supports Gen-4.5, Gen-3 Alpha, and Act-Two for character performance.
`;
    case "pika":
      return `
**Pika Usage:**
Visit https://pika.art and use their web interface or API.
Specialized for stylized and experimental video content.
`;
    default:
      return "";
  }
}

// src/tools/video-edit.ts
import { join as join9 } from "path";
import { mkdir as mkdir7, writeFile as writeFile5 } from "fs/promises";
function createVideoEditTool(ctx) {
  return {
    name: "brandly_video_edit",
    description: "Edit videos using Remotion \u2014 trim, concat, overlay, add transitions, text, audio, effects. Creates Remotion compositions for programmatic video editing.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        operation: {
          type: "string",
          enum: [
            "trim",
            "concat",
            "overlay",
            "transition",
            "add-text",
            "add-audio",
            "add-effect",
            "resize",
            "crop",
            "render"
          ],
          description: "Video editing operation to perform"
        },
        inputFiles: {
          type: "array",
          items: { type: "string" },
          description: "Input video file paths or URLs"
        },
        params: {
          type: "object",
          description: "Operation-specific parameters"
        },
        outputFormat: {
          type: "string",
          enum: ["mp4", "webm", "gif"],
          default: "mp4",
          description: "Output video format"
        }
      },
      required: ["projectID", "operation", "inputFiles"]
    },
    execute: async (args) => {
      const { projectID, operation, inputFiles, params, outputFormat } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const editDir = join9(ctx.directory, "video-edits", projectID);
      await mkdir7(editDir, { recursive: true });
      const composition = generateRemotionComposition(operation, inputFiles, params, outputFormat);
      const compositionPath = join9(editDir, `composition-${Date.now().tsx}`);
      await writeFile5(compositionPath, composition, "utf-8");
      const editMeta = {
        id: `edit-${Date.now()}`,
        name: `${operation}-edit`,
        composition: compositionPath,
        fps: 30,
        durationInFrames: 300,
        width: 1920,
        height: 1080,
        operations: [{ type: operation, params }],
        inputFiles,
        outputFormat: outputFormat || "mp4",
        status: "pending"
      };
      const metaPath = join9(editDir, `edit-${editMeta.id}.json`);
      await writeFile5(metaPath, JSON.stringify(editMeta, null, 2), "utf-8");
      if (!project.phases) {
        project.phases = {};
      }
      const currentPhase = project.currentPhase;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString()
        };
      }
      const phaseOutput = project.phases[currentPhase].output ? JSON.parse(project.phases[currentPhase].output || "{}") : {};
      if (!phaseOutput.videoEdits) {
        phaseOutput.videoEdits = [];
      }
      phaseOutput.videoEdits.push({
        editId: editMeta.id,
        operation,
        compositionPath,
        inputFiles,
        outputFormat,
        createdAt: new Date().toISOString()
      });
      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);
      return {
        projectId: projectID,
        editId: editMeta.id,
        operation,
        compositionPath,
        inputFiles,
        outputFormat,
        status: "created",
        message: `Video edit composition created: ${compositionPath}`,
        nextSteps: [
          "1. Review the generated Remotion composition",
          "2. Install Remotion if not present: npm i -g remotion",
          "3. Render the video: remotion render <composition-path>",
          "4. Or use brandly_render_video tool to render"
        ]
      };
    }
  };
}
function generateRemotionComposition(operation, inputFiles, params, outputFormat) {
  const width = params.width || 1920;
  const height = params.height || 1080;
  const fps = params.fps || 30;
  switch (operation) {
    case "trim":
      return generateTrimComposition(inputFiles[0], params, width, height, fps);
    case "concat":
      return generateConcatComposition(inputFiles, params, width, height, fps);
    case "overlay":
      return generateOverlayComposition(inputFiles, params, width, height, fps);
    case "transition":
      return generateTransitionComposition(inputFiles, params, width, height, fps);
    case "add-text":
      return generateTextComposition(inputFiles[0], params, width, height, fps);
    case "add-audio":
      return generateAudioComposition(inputFiles[0], params, width, height, fps);
    case "add-effect":
      return generateEffectComposition(inputFiles[0], params, width, height, fps);
    case "resize":
      return generateResizeComposition(inputFiles[0], params, width, height, fps);
    case "crop":
      return generateCropComposition(inputFiles[0], params, width, height, fps);
    default:
      return generateDefaultComposition(inputFiles, width, height, fps);
  }
}
function generateTrimComposition(input, params, width, height, fps) {
  const startTime = params.startTime || 0;
  const duration = params.duration || 5;
  return `import { Composition, Video, staticFile } from 'remotion';

const TrimmedVideo = () => {
  return (
    <Video
      src={staticFile('${input}')}
      startFrom={${startTime * fps}}
      endAt={${(startTime + duration) * fps}}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TrimmedVideo"
      component={TrimmedVideo}
      durationInFrames={${duration * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateConcatComposition(inputs, params, width, height, fps) {
  const transitionDuration = params.transitionDuration || 1;
  const totalDuration = inputs.length * 3;
  return `import { Composition, Sequence, Video, staticFile } from 'remotion';

const ConcatenatedVideo = () => {
  const clips = [
    ${inputs.map((input, i) => `"${input}"`).join(`,
    `)}
  ];

  return (
    <>
      {clips.map((clip, index) => (
        <Sequence
          key={index}
          from={index * ${3 * fps}}
          durationInFrames={${3 * fps}}
        >
          <Video
            src={staticFile(clip)}
            style={{ width: '100%', height: '100%' }}
          />
        </Sequence>
      ))}
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="ConcatenatedVideo"
      component={ConcatenatedVideo}
      durationInFrames={${totalDuration * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateOverlayComposition(inputs, params, width, height, fps) {
  const overlayPosition = params.position || "top-right";
  const overlayScale = params.scale || 0.3;
  return `import { Composition, Video, Img, staticFile } from 'remotion';

const OverlayVideo = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Video
        src={staticFile('${inputs[0]}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Img
        src={staticFile('${inputs[1] || inputs[0]}')}
        style={{
          position: 'absolute',
          ${overlayPosition.includes("top") ? "top: 20px" : "bottom: 20px"},
          ${overlayPosition.includes("left") ? "left: 20px" : "right: 20px"},
          width: '${overlayScale * 100}%',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="OverlayVideo"
      component={OverlayVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateTransitionComposition(inputs, params, width, height, fps) {
  const transitionType = params.transitionType || "fade";
  const transitionDuration = params.transitionDuration || 1;
  return `import { Composition, Sequence, Video, staticFile, interpolate, useCurrentFrame } from 'remotion';

const TransitionVideo = () => {
  const frame = useCurrentFrame();
  const clipDuration = ${3 * fps};
  const transitionFrames = ${transitionDuration * fps};

  return (
    <>
      ${inputs.map((input, i) => `
      <Sequence from={${i * (3 - transitionDuration) * fps}} durationInFrames={clipDuration}>
        <Video
          src={staticFile('${input}')}
          style={{
            width: '100%',
            height: '100%',
            opacity: interpolate(
              frame,
              [0, transitionFrames, clipDuration - transitionFrames, clipDuration],
              [0, 1, 1, 0],
              { extrapolateRight: 'clamp' }
            )
          }}
        />
      </Sequence>`).join(`
`)}
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TransitionVideo"
      component={TransitionVideo}
      durationInFrames={${inputs.length * 3 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateTextComposition(input, params, width, height, fps) {
  const text = params.text || "Your Text Here";
  const fontSize = params.fontSize || 72;
  const color = params.color || "#ffffff";
  const position = params.position || "center";
  return `import { Composition, Video, Text, staticFile, interpolate, useCurrentFrame } from 'remotion';

const TextOverlayVideo = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Video
        src={staticFile('${input}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Text
        text="${text}"
        style={{
          position: 'absolute',
          ${position === "center" ? "top: 50%, left: 50%, transform: 'translate(-50%, -50%)" : position === "top" ? "top: 10%" : "bottom: 10%"},
          fontSize: ${fontSize},
          color: '${color}',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          fontFamily: 'Arial, sans-serif'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="TextOverlayVideo"
      component={TextOverlayVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateAudioComposition(input, params, width, height, fps) {
  const audioFile = params.audioFile || "audio.mp3";
  const volume = params.volume || 0.8;
  return `import { Composition, Video, Audio, staticFile } from 'remotion';

const AudioVideo = () => {
  return (
    <>
      <Video
        src={staticFile('${input}')}
        style={{ width: '100%', height: '100%' }}
      />
      <Audio
        src={staticFile('${audioFile}')}
        volume={${volume}}
      />
    </>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="AudioVideo"
      component={AudioVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateEffectComposition(input, params, width, height, fps) {
  const effectType = params.effectType || "blur";
  const intensity = params.intensity || 5;
  return `import { Composition, Video, staticFile, interpolate, useCurrentFrame } from 'remotion';

const EffectVideo = () => {
  const frame = useCurrentFrame();

  return (
    <Video
      src={staticFile('${input}')}
      style={{
        width: '100%',
        height: '100%',
        filter: '${effectType}(${intensity}px)'
      }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="EffectVideo"
      component={EffectVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateResizeComposition(input, params, width, height, fps) {
  const newWidth = params.newWidth || 1280;
  const newHeight = params.newHeight || 720;
  return `import { Composition, Video, staticFile } from 'remotion';

const ResizedVideo = () => {
  return (
    <Video
      src={staticFile('${input}')}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="ResizedVideo"
      component={ResizedVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${newWidth}}
      height={${newHeight}}
    />
  );
};
`;
}
function generateCropComposition(input, params, width, height, fps) {
  const cropX = params.x || 0;
  const cropY = params.y || 0;
  const cropWidth = params.width || width;
  const cropHeight = params.height || height;
  return `import { Composition, Video, staticFile } from 'remotion';

const CroppedVideo = () => {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Video
        src={staticFile('${input}')}
        style={{
          width: '${width / cropWidth * 100}%',
          height: '${height / cropHeight * 100}%',
          objectFit: 'cover',
          objectPosition: '-${cropX}px -${cropY}px'
        }}
      />
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="CroppedVideo"
      component={CroppedVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${cropWidth}}
      height={${cropHeight}}
    />
  );
};
`;
}
function generateDefaultComposition(inputs, width, height, fps) {
  return `import { Composition, Video, staticFile } from 'remotion';

const DefaultVideo = () => {
  return (
    <Video
      src={staticFile('${inputs[0]}')}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="DefaultVideo"
      component={DefaultVideo}
      durationInFrames={${10 * fps}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

// src/tools/video-render.ts
import { join as join10 } from "path";
import { mkdir as mkdir8, writeFile as writeFile6 } from "fs/promises";
import { existsSync as existsSync6 } from "fs";
function createVideoRenderTool(ctx) {
  return {
    name: "brandly_render_video",
    description: "Render a Remotion composition to produce the final video file. Executes remotion render command to generate MP4, WebM, or GIF output.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        compositionPath: {
          type: "string",
          description: "Path to the Remotion composition file"
        },
        outputPath: {
          type: "string",
          description: "Output video file path (optional)"
        },
        format: {
          type: "string",
          enum: ["mp4", "webm", "gif"],
          default: "mp4",
          description: "Output video format"
        },
        quality: {
          type: "string",
          enum: ["low", "medium", "high", "ultra"],
          default: "high",
          description: "Rendering quality preset"
        }
      },
      required: ["projectID", "compositionPath"]
    },
    execute: async (args) => {
      const { projectID, compositionPath, outputPath, format, quality } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      if (!existsSync6(compositionPath)) {
        throw new Error(`Composition file not found: ${compositionPath}`);
      }
      const outputDir = join10(ctx.directory, "renders", projectID);
      await mkdir8(outputDir, { recursive: true });
      const finalOutputPath = outputPath || join10(outputDir, `render-${Date.now()}.${format}`);
      const renderCommand = generateRenderCommand(compositionPath, finalOutputPath, format, quality);
      const scriptPath = join10(outputDir, `render-${Date.now()}.sh`);
      await writeFile6(scriptPath, renderCommand, "utf-8");
      const renderMeta = {
        id: `render-${Date.now()}`,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        command: renderCommand,
        scriptPath,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      const metaPath = join10(outputDir, `render-${renderMeta.id}.json`);
      await writeFile6(metaPath, JSON.stringify(renderMeta, null, 2), "utf-8");
      if (!project.phases) {
        project.phases = {};
      }
      const currentPhase = project.currentPhase;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString()
        };
      }
      const phaseOutput = project.phases[currentPhase].output ? JSON.parse(project.phases[currentPhase].output || "{}") : {};
      if (!phaseOutput.renders) {
        phaseOutput.renders = [];
      }
      phaseOutput.renders.push({
        renderId: renderMeta.id,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        scriptPath,
        createdAt: new Date().toISOString()
      });
      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);
      return {
        projectId: projectID,
        renderId: renderMeta.id,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        scriptPath,
        status: "created",
        message: `Render script created: ${scriptPath}`,
        renderCommand,
        nextSteps: [
          "1. Install Remotion if not present: npm i -g remotion",
          "2. Run the render script: bash " + scriptPath,
          "3. Or run manually: " + renderCommand,
          "4. Wait for rendering to complete",
          "5. Output will be saved to: " + finalOutputPath
        ]
      };
    }
  };
}
function generateRenderCommand(compositionPath, outputPath, format, quality) {
  const qualityFlags = {
    low: "--quality 50",
    medium: "--quality 75",
    high: "--quality 90",
    ultra: "--quality 100"
  };
  const qualityFlag = qualityFlags[quality] || qualityFlags.high;
  const formatFlags = {
    mp4: "--codec h264",
    webm: "--codec vp8",
    gif: "--codec gif"
  };
  const formatFlag = formatFlags[format] || formatFlags.mp4;
  return `#!/bin/bash
# Brandly Video Render Script
# Generated: ${new Date().toISOString()}

# Check if Remotion is installed
if ! command -v remotion &> /dev/null; then
    echo "Remotion is not installed. Installing..."
    npm i -g remotion
fi

# Render the video
echo "Rendering video..."
remotion render "${compositionPath}" "${outputPath}" ${formatFlag} ${qualityFlag}

# Check if render was successful
if [ $? -eq 0 ]; then
    echo "\u2705 Render complete: ${outputPath}"
else
    echo "\u274C Render failed"
    exit 1
fi
`;
}

// src/tools/assembly.ts
import { join as join11 } from "path";
import { mkdir as mkdir9, writeFile as writeFile7, readdir as readdir3 } from "fs/promises";
import { existsSync as existsSync7 } from "fs";
async function discoverMedia(dir) {
  if (!existsSync7(dir))
    return [];
  const clips = [];
  const entries = await readdir3(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join11(dir, entry.name);
    if (entry.isDirectory()) {
      const subClips = await discoverMedia(fullPath);
      clips.push(...subClips);
    } else {
      const ext = entry.name.toLowerCase();
      if (ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".mov")) {
        clips.push({ path: fullPath, type: "video", name: entry.name });
      } else if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif")) {
        clips.push({ path: fullPath, type: "image", name: entry.name });
      } else if (ext.endsWith(".mp3") || ext.endsWith(".wav") || ext.endsWith(".ogg")) {
        clips.push({ path: fullPath, type: "audio", name: entry.name });
      }
    }
  }
  return clips;
}
function inferDurationForImage(fps) {
  return 3;
}
function generateAssemblyPlan(assets, params, style) {
  const fps = params.fps || 30;
  const width = params.width || 1920;
  const height = params.height || 1080;
  const clipDuration = params.clipDuration || 3;
  const transitionType = params.transitionType || "fade";
  const transitionDuration = params.transitionDuration || 0.5;
  const videos = assets.filter((a) => a.type === "video");
  const images = assets.filter((a) => a.type === "image");
  const audios = assets.filter((a) => a.type === "audio");
  const backgroundMusic = audios.length > 0 ? audios[0] : undefined;
  const orderedClips = [...videos, ...images];
  const segments = [];
  for (const clip of orderedClips) {
    const duration = clip.type === "image" ? inferDurationForImage(fps) : clipDuration;
    segments.push({
      clip,
      duration,
      transition: transitionType,
      transitionDuration
    });
  }
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  return {
    segments,
    totalDuration,
    fps,
    width,
    height,
    backgroundMusic,
    style
  };
}
function generateRemotionProject(plan, projectName) {
  const { segments, fps, width, height, backgroundMusic } = plan;
  const clipImports = segments.map((seg, i) => {
    const ext = seg.clip.name.split(".").pop();
    const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
    const importPath = `./assets/${seg.clip.name}`;
    return `import ${isVideo ? "Video" : "Img"}_${i} from "${importPath}";`;
  }).join(`
`);
  const audioImport = backgroundMusic ? `import audioTrack from "./assets/${backgroundMusic.name}";` : "";
  const clipDeclarations = segments.map((seg, i) => {
    const ext = seg.clip.name.split(".").pop();
    const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
    return `  const Clip_${i}: ${isVideo ? "typeof Video" : "typeof Img"}_${i} = ${isVideo ? "Video" : "Img"}_${i};`;
  }).join(`
`);
  const sequenceBlocks = segments.map((seg, i) => {
    const frameStart = segments.slice(0, i).reduce((sum, s) => sum + s.duration * fps, 0);
    const durationFrames = Math.round(seg.duration * fps);
    const ext = seg.clip.name.split(".").pop();
    const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
    return `      <Sequence from={${frameStart}} durationInFrames={${durationFrames}}>
        <${isVideo ? "Video" : "Img"}
          src={${isVideo ? "Video" : "Img"}_${i}}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          ${isVideo ? "" : `durationInFrames={${durationFrames}}`}
        />
        ${seg.text ? `<TextOverlay text="${seg.text}" position="${seg.textPosition || "bottom"}" />` : ""}
      </Sequence>`;
  }).join(`
`);
  const totalFrames = Math.round(plan.totalDuration * fps);
  return `import { Composition, Sequence, Audio, staticFile } from 'remotion';
${clipImports}
${audioImport}

${clipDeclarations}

const TextOverlay = ({ text, position }: { text: string; position: string }) => {
  const posStyle = position === 'top'
    ? { top: '10%' }
    : position === 'center'
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { bottom: '10%' };

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      transform: position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
      ...posStyle,
      color: 'white',
      fontSize: 48,
      fontWeight: 'bold',
      textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '8px 24px',
      borderRadius: 8,
      background: 'rgba(0,0,0,0.4)',
    }}>
      {text}
    </div>
  );
};

const MontageComposition = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black' }}>
${sequenceBlocks}
${backgroundMusic ? `      <Audio src={audioTrack} volume={0.8} />` : ""}
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="${projectName}"
      component={MontageComposition}
      durationInFrames={${totalFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}
function generateRemotionConfig(projectName) {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
}
function generatePackageJson(projectName) {
  return JSON.stringify({
    name: projectName.toLowerCase().replace(/\s+/g, "-"),
    version: "1.0.0",
    private: true,
    scripts: {
      start: "npx remotion studio",
      build: "npx remotion render src/index.ts " + projectName + " out/video.mp4",
      "build:gif": "npx remotion render src/index.ts " + projectName + " out/video.gif --codec gif",
      "build:webm": "npx remotion render src/index.ts " + projectName + " out/video.webm --codec vp8"
    },
    dependencies: {
      "@remotion/cli": "^4.0.0",
      remotion: "^4.0.0",
      react: "^18.2.0",
      "react-dom": "^18.2.0"
    },
    devDependencies: {
      "@types/react": "^18.2.0",
      typescript: "^5.4.0"
    }
  }, null, 2);
}
function generateRootIndex(projectName) {
  return `import { registerRoot } from "remotion";
import { RemotionComposition } from "./Composition";

registerRoot(RemotionComposition);
`;
}
function generateBuildScript(projectDir, outputPath) {
  return `#!/bin/bash
# Brandly Assembly Build Script
# Generated: ${new Date().toISOString()}

set -e

echo "\uD83C\uDFAC Building montage: ${projectDir}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "\uD83D\uDCE6 Installing dependencies..."
  npm install
fi

# Render the video
echo "\uD83C\uDFA5 Rendering video..."
npx remotion render src/index.ts Montage "${outputPath}" --codec h264

echo "\u2705 Build complete: ${outputPath}"
`;
}
function createAssemblyTool(ctx) {
  return {
    name: "brandly_assemble",
    description: "Assemble all generated video clips, images, and audio into a final montage using a complete Remotion project. Discovers assets, creates project structure, and optionally renders the final video.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID"
        },
        style: {
          type: "string",
          enum: ["montage", "cinematic", "ugc", "continuous", "simple"],
          default: "montage",
          description: "Assembly style preset"
        },
        clipDuration: {
          type: "number",
          default: 3,
          description: "Default duration in seconds for each video clip (images always use 3s)"
        },
        transitionType: {
          type: "string",
          enum: ["fade", "slide", "wipe", "none"],
          default: "fade",
          description: "Transition type between clips"
        },
        transitionDuration: {
          type: "number",
          default: 0.5,
          description: "Transition duration in seconds"
        },
        fps: {
          type: "number",
          default: 30,
          description: "Frames per second"
        },
        width: {
          type: "number",
          default: 1920,
          description: "Output width in pixels"
        },
        height: {
          type: "number",
          default: 1080,
          description: "Output height in pixels"
        },
        outputPath: {
          type: "string",
          description: "Output file path for rendered video"
        },
        autoRender: {
          type: "boolean",
          default: false,
          description: "Automatically render after creating the project"
        },
        clipOrder: {
          type: "array",
          items: { type: "string" },
          description: "Optional explicit clip order by filename. Unlisted clips are appended."
        }
      },
      required: ["projectID"]
    },
    execute: async (args) => {
      const {
        projectID,
        style,
        clipDuration,
        transitionType,
        transitionDuration,
        fps,
        width,
        height,
        outputPath,
        autoRender,
        clipOrder
      } = args;
      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }
      const projectName = project.name || `brandly-${projectID.slice(0, 8)}`;
      const mediaFolders = ["imagen", "videgen", "audgen"];
      const allAssets = [];
      for (const folder of mediaFolders) {
        const mediaDir = join11(ctx.directory, folder, projectID);
        const assets = await discoverMedia(mediaDir);
        allAssets.push(...assets);
      }
      const projectDir = join11(ctx.projectsDir, projectID);
      const artifactsDir = join11(projectDir, "artifacts");
      const artifactAssets = await discoverMedia(artifactsDir);
      allAssets.push(...artifactAssets);
      if (allAssets.length === 0) {
        throw new Error("No media assets found. Generate videos/images/audio first using brandly_image, brandly_video tools.");
      }
      let orderedAssets = allAssets;
      if (clipOrder && Array.isArray(clipOrder) && clipOrder.length > 0) {
        const orderMap = new Map(clipOrder.map((name, i) => [name, i]));
        orderedAssets = [...allAssets].sort((a, b) => {
          const aIdx = orderMap.has(a.name) ? orderMap.get(a.name) : Infinity;
          const bIdx = orderMap.has(b.name) ? orderMap.get(b.name) : Infinity;
          return aIdx - bIdx;
        });
      }
      const plan = generateAssemblyPlan(orderedAssets, {
        fps,
        width,
        height,
        clipDuration,
        transitionType,
        transitionDuration
      }, style || "montage");
      const assemblyDir = join11(ctx.directory, "assembly", projectID);
      const srcDir = join11(assemblyDir, "src");
      const assetsDir = join11(assemblyDir, "assets");
      const outDir = join11(assemblyDir, "out");
      await mkdir9(srcDir, { recursive: true });
      await mkdir9(assetsDir, { recursive: true });
      await mkdir9(outDir, { recursive: true });
      const copiedAssets = [];
      for (const asset of orderedAssets) {
        const srcPath = asset.path;
        const destPath = join11(assetsDir, asset.name);
        if (!existsSync7(destPath)) {
          const { copyFile: copyFile2 } = await import("fs/promises");
          await copyFile2(srcPath, destPath);
        }
        copiedAssets.push(asset.name);
      }
      const compositionCode = generateRemotionProject(plan, projectName);
      await writeFile7(join11(srcDir, "Composition.tsx"), compositionCode, "utf-8");
      const rootIndex = generateRootIndex(projectName);
      await writeFile7(join11(srcDir, "index.ts"), rootIndex, "utf-8");
      const remotionConfig = generateRemotionConfig(projectName);
      await writeFile7(join11(assemblyDir, "remotion.config.ts"), remotionConfig, "utf-8");
      const packageJson = generatePackageJson(projectName);
      await writeFile7(join11(assemblyDir, "package.json"), packageJson, "utf-8");
      const finalOutputPath = outputPath || join11(outDir, `${projectName.toLowerCase().replace(/\s+/g, "-")}.mp4`);
      const buildScript = generateBuildScript(assemblyDir, finalOutputPath);
      const buildScriptPath = join11(assemblyDir, "build.sh");
      await writeFile7(buildScriptPath, buildScript, "utf-8");
      const assemblyMeta = {
        id: `assembly-${Date.now()}`,
        projectId: projectID,
        projectName,
        style: plan.style,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        fps: plan.fps,
        width: plan.width,
        height: plan.height,
        clips: copiedAssets,
        backgroundMusic: plan.backgroundMusic?.name || null,
        assemblyDir,
        compositionPath: join11(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        createdAt: new Date().toISOString()
      };
      const metaPath = join11(assemblyDir, "assembly-meta.json");
      await writeFile7(metaPath, JSON.stringify(assemblyMeta, null, 2), "utf-8");
      if (!project.phases) {
        project.phases = {};
      }
      const currentPhase = project.currentPhase;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString()
        };
      }
      const phaseOutput = project.phases[currentPhase].output ? JSON.parse(project.phases[currentPhase].output || "{}") : {};
      if (!phaseOutput.assemblies) {
        phaseOutput.assemblies = [];
      }
      phaseOutput.assemblies.push({
        assemblyId: assemblyMeta.id,
        assemblyDir,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        outputPath: finalOutputPath,
        createdAt: new Date().toISOString()
      });
      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);
      const nextSteps = [
        `1. cd ${assemblyDir}`,
        "2. Install dependencies: npm install",
        "3. Preview in Remotion Studio: npm start",
        `4. Render final video: npm run build`,
        `   Output: ${finalOutputPath}`
      ];
      if (autoRender) {
        nextSteps.push("5. Auto-render was requested \u2014 run: bash " + buildScriptPath);
      }
      return {
        projectId: projectID,
        assemblyId: assemblyMeta.id,
        projectName,
        style: plan.style,
        assemblyDir,
        segmentCount: plan.segments.length,
        totalDuration: `${plan.totalDuration.toFixed(1)}s`,
        clips: copiedAssets,
        backgroundMusic: plan.backgroundMusic?.name || null,
        compositionPath: join11(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        message: `Remotion assembly project created with ${plan.segments.length} clips (${plan.totalDuration.toFixed(1)}s total)`,
        nextSteps
      };
    }
  };
}

// src/index.ts
function brandlyPlugin({
  directory
}) {
  const ctx = createContext(directory);
  const tools = [
    createStartTool(ctx),
    createStatusTool(ctx),
    createApproveTool(ctx),
    createRunTool(ctx),
    createEstimateTool(ctx),
    createReEditTool(ctx),
    createValidateTool(ctx),
    createMemoryTool(ctx),
    createImageTool(ctx),
    createCostTool(ctx),
    createArtifactTool(ctx),
    createTemplatesTool(ctx),
    createCancelTool(ctx),
    createProgressTool(ctx),
    createExportTool(ctx),
    createDownloadTool(ctx),
    createProviderTool(ctx),
    createVideoEditTool(ctx),
    createVideoRenderTool(ctx),
    createAssemblyTool(ctx)
  ];
  return {
    name: "brandly",
    tools
  };
}
export {
  brandlyPlugin as default
};
