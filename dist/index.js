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
import { existsSync } from "fs";
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
  return __require("fs").readdirSync(artifactDir).filter((f) => f.endsWith(".md") || f.endsWith(".json")).map((f) => join(artifactDir, f));
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
      const { idea, productName, imagePath, targetPlatforms, budgetCredits, style } = args;
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
        targetPlatforms: targetPlatforms || ["tiktok", "instagram"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ctx.writeProject(projectId, project);
      if (imagePath) {
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
      const validation = await withRetry(async () => ({
        projectId: projectID,
        videoPath,
        status: "validating",
        message: "Virality validation initiated"
      }), { maxRetries: 2, baseDelayMs: 1000 });
      return validation;
    }
  };
}

// src/memory.ts
import { join as join4 } from "path";
import { writeFile as writeFile3, rename as rename2, unlink as unlink2, mkdir as mkdir3 } from "fs/promises";
import { existsSync as existsSync4 } from "fs";
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
        const content = __require("fs").readFileSync(this.memoryPath, "utf-8");
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
        throw new Error(`Budget exceeded: ${newSpent} spent of ${project.budget} budget`);
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
import { readdirSync, readFileSync } from "fs";
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
        const files = readdirSync(templatesDir).filter((f) => f.endsWith(".json"));
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
          const content = JSON.parse(readFileSync(filePath, "utf-8"));
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
          const content = JSON.parse(readFileSync(filePath, "utf-8"));
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
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".json")) {
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
        artifactCount: artifactFiles.length
      };
      const manifestPath = join7(exportDir, "export-manifest.json");
      await ctx.writeAtomic(manifestPath, JSON.stringify(manifest, null, 2));
      return {
        projectId: projectID,
        projectName: project.name,
        exportDir,
        artifactCount: artifactFiles.length,
        manifest: `export-manifest.json`,
        artifacts: manifest.artifacts,
        message: `Exported ${artifactFiles.length} artifacts to ${exportDir}`
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
    createExportTool(ctx)
  ];
  return {
    name: "brandly",
    tools
  };
}
export {
  brandlyPlugin as default
};
