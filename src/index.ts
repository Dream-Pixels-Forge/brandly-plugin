import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import { mkdir, writeFile, readFile, rename, appendFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { CostTracker } from "./cost-tracker";
import { Memory } from "./memory";
import type { ProjectState, Shot } from "./types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve agent files relative to this module (works in both dev and packaged installs)
const _moduleDir = dirname(fileURLToPath(import.meta.url));
const AGENT_DIR = join(_moduleDir, "..", "agents");

// C4 fix: single source of truth for pipeline phases
const PHASE_ORDER = [
  "init",
  "trends",
  "concept",
  "script",
  "asset",
  "audio",
  "re_edit",
  "validate",
  "publish",
  "done",
] as const;

// C3/C4 fix: every runnable phase has an agent (done is terminal, validate uses brandly_validate MCP)
const PHASE_AGENT_MAP: Record<string, string> = {
  init: "trends_agent.md",
  trends: "concept_agent.md",
  concept: "script_agent.md",
  script: "asset_agent.md",
  asset: "audio_agent.md",
  audio: "audio_agent.md",
  re_edit: "script_agent.md",
};

const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  // H2 fix: use `directory` param (workspace root) instead of process.cwd()
  const BRANDLY_DIR = join(directory, ".brandly");
  const PROJECTS_DIR = join(BRANDLY_DIR, "projects");
  const IMAGEN_DIR = join(directory, "imagen");
  const VIDEOGEN_DIR = join(directory, "videgen");
  const AUDGEN_DIR = join(directory, "audgen");

  // Lazy init: do NOT create folders at plugin load. They are created when
  // (a) the user invokes the `/brandly` slash command (via command.execute.before
  //     hook below), or (b) any tool that needs them runs (ensureBaseDirs fallback).
  let baseDirsEnsured = false;
  async function ensureBaseDirs(): Promise<void> {
    if (baseDirsEnsured) return;
    await mkdir(PROJECTS_DIR, { recursive: true });
    await mkdir(IMAGEN_DIR, { recursive: true });
    await mkdir(VIDEOGEN_DIR, { recursive: true });
    await mkdir(AUDGEN_DIR, { recursive: true });
    baseDirsEnsured = true;
  }

  // C1 fix: wire CostTracker with correct base dir
  const costTracker = new CostTracker(PROJECTS_DIR);
  // H2/H3 fix: single Memory instance with correct base dir
  const memory = new Memory(BRANDLY_DIR);

  // ── Path helpers (use closure-captured base dirs) ──

  function getProjectDir(id: string) {
    return join(PROJECTS_DIR, id);
  }

  function getProjectPath(id: string) {
    return join(getProjectDir(id), "project.json");
  }

  function getArtifactDir(id: string, category: string) {
    return join(getProjectDir(id), category);
  }

  function getAnalysisPath(id: string) {
    return join(getArtifactDir(id, "analysis"), "image-analysis.md");
  }

  function getTrendsPath(id: string) {
    return join(getArtifactDir(id, "analysis"), "trends.md");
  }

  function getConceptPath(id: string) {
    return join(getArtifactDir(id, "script"), "concept.md");
  }

  function getScriptPath(id: string) {
    return join(getArtifactDir(id, "script"), "script.md");
  }

  function getStoryboardPath(id: string) {
    return join(getArtifactDir(id, "storyboard"), "storyboard.md");
  }

  function getAssetPlanPath(id: string) {
    return join(getArtifactDir(id, "assets"), "asset-plan.json");
  }

  function getAudioPlanPath(id: string) {
    return join(getArtifactDir(id, "audio"), "audio-plan.md");
  }

  // Generated content dirs (outside .brandly — for binary files)
  function getImagenDir(id: string) {
    return join(IMAGEN_DIR, id);
  }

  function getVideogenDir(id: string) {
    return join(VIDEOGEN_DIR, id);
  }

  function getAudgenDir(id: string) {
    return join(AUDGEN_DIR, id);
  }

  async function createProjectStructure(id: string): Promise<void> {
    await ensureBaseDirs();
    const dirs = [
      getProjectDir(id),
      getArtifactDir(id, "analysis"),
      getArtifactDir(id, "script"),
      getArtifactDir(id, "storyboard"),
      getArtifactDir(id, "assets"),
      getArtifactDir(id, "audio"),
      getImagenDir(id),
      getVideogenDir(id),
      getAudgenDir(id),
    ];
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
    }
  }

  // H1 fix: atomic writes via temp + rename
  async function writeProject(id: string, state: ProjectState): Promise<void> {
    state.updatedAt = new Date().toISOString();
    const targetPath = getProjectPath(id);
    const tmpPath = targetPath + ".tmp";
    await writeFile(tmpPath, JSON.stringify(state, null, 2));
    await rename(tmpPath, targetPath);
  }

  // H6 fix: return null instead of throwing
  async function readProject(id: string): Promise<ProjectState | null> {
    try {
      const raw = await readFile(getProjectPath(id), "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function writeArtifact(id: string, category: string, filename: string, content: string): Promise<void> {
    await ensureBaseDirs();
    const dir = getArtifactDir(id, category);
    await mkdir(dir, { recursive: true });
    const targetPath = join(dir, filename);
    const tmpPath = targetPath + ".tmp";
    await writeFile(tmpPath, content, "utf-8");
    await rename(tmpPath, targetPath);
  }

  async function readArtifact(id: string, category: string, filename: string): Promise<string | null> {
    try {
      return await readFile(join(getArtifactDir(id, category), filename), "utf-8");
    } catch {
      return null;
    }
  }

  async function logAction(id: string, action: string, detail: string): Promise<void> {
    await ensureBaseDirs();
    const logFile = join(getProjectDir(id), "history.log");
    const entry = `[${new Date().toISOString()}] ${action}: ${detail}\n`;
    await appendFile(logFile, entry, "utf-8");
  }

  // Security: validate project ID is a UUID
  function isValidProjectId(id: string): boolean {
    return UUID_RE.test(id);
  }

  // Security: media paths must be URLs or inside the workspace
  function isPathAllowed(inputPath: string): boolean {
    if (!inputPath) return false;
    if (/^https?:\/\//i.test(inputPath)) return true;
    if (inputPath.includes("..")) return false;
    if (/^[a-zA-Z]:\\/.test(inputPath) || inputPath.startsWith("/")) {
      return inputPath.toLowerCase().startsWith(directory.toLowerCase());
    }
    return true;
  }

  // ── Artifact path resolver per phase (M5 fix: trends and concept save to different files) ──

  function getArtifactPathsForPhase(phase: string, projectId: string): Record<string, string> {
    switch (phase) {
      case "trends":
        return { trends: getTrendsPath(projectId) };
      case "concept":
        return { concept: getConceptPath(projectId) };
      case "script":
        return { script: getScriptPath(projectId), storyboard: getStoryboardPath(projectId) };
      case "asset":
        return { assetPlan: getAssetPlanPath(projectId) };
      case "audio":
        return { audioPlan: getAudioPlanPath(projectId) };
      default:
        return {};
    }
  }

  // C5 fix: phase-based cost estimate for budget gate
  function getPhaseCostEstimate(phase: string, state: ProjectState): number {
    const styleCosts: Record<string, number> = {
      cinematic: 35,
      ugc: 25,
      montage: 20,
      multi_shot: 30,
      continuous: 40,
      unboxing: 25,
      lifestyle: 30,
    };
    switch (phase) {
      case "script":
        return 0;
      case "asset":
        return (state.shots?.length || 5) * (styleCosts[state.style ?? "cinematic"] ?? 30);
      case "audio":
        return 30;
      case "re_edit":
        return 30;
      case "validate":
        return 15;
      case "publish":
        return 0;
      default:
        return 0;
    }
  }

  const tools = {
    brandly_start: tool({
      description:
        "Start a new Brandly video project. Provide a product idea (and optionally an image) to kick off the agent pipeline. Creates a new project directory and returns the project ID.",
      args: {
        idea: tool.schema.string().describe("Product idea, concept, or brief"),
        productName: tool.schema.string().describe("Name of the product"),
        imagePath: tool.schema.string().optional().describe("Optional path to a product image"),
        targetPlatforms: tool.schema
          .array(tool.schema.enum(["tiktok", "instagram", "youtube", "all"]))
          .default(["tiktok", "instagram"])
          .describe("Target social platforms"),
        budgetCredits: tool.schema.number().gt(0).default(500).describe("Max credits to spend on this project"),
        style: tool.schema
          .enum(["cinematic", "ugc", "montage", "multi_shot", "continuous", "unboxing", "lifestyle"])
          .optional()
          .describe("Video style preference"),
      },
      execute: async (args, ctx) => {
        const id = randomUUID();
        await createProjectStructure(id);

        const state: ProjectState = {
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          inputType: args.imagePath ? "idea_with_image" : "idea",
          idea: args.idea,
          imagePath: args.imagePath,
          productName: args.productName,
          targetPlatforms: args.targetPlatforms,
          style: args.style,
          budgetCredits: args.budgetCredits,
          creditsSpent: 0,
          currentPhase: "init",
          shots: [],
          previewMode: true,
          previewPaths: {},
          previewApproved: false,
          reEditHistory: [],
          userPreferences: { likedHooks: [], dislikedHooks: [] },
          audioTrack: { source: "none" },
          costLog: [],
          viralityScore: undefined,
          finalCutPath: undefined,
          publishPaths: {},
          artifactPaths: {
            analysis: getAnalysisPath(id),
            trends: getTrendsPath(id),
            concept: getConceptPath(id),
            script: getScriptPath(id),
            storyboard: getStoryboardPath(id),
            assetPlan: getAssetPlanPath(id),
            audioPlan: getAudioPlanPath(id),
          },
          genDirs: {
            imagen: getImagenDir(id),
            videgen: getVideogenDir(id),
            audgen: getAudgenDir(id),
          },
        };

        await writeProject(id, state);
        await logAction(id, "project_created", `Product: ${args.productName}`);

        // H5 fix: do NOT call recordProjectCompletion at creation time
        return JSON.stringify({
          projectID: id,
          status: "created",
          projectPath: getProjectDir(id),
          artifactPaths: state.artifactPaths,
          genDirs: state.genDirs,
          message: `Project "${args.productName}" created. Info in .brandly/projects/${id}/. Images to imagen/${id}/. Videos to videgen/${id}/. Audio to audgen/${id}/. Use brandly_run_project to start the agent pipeline.`,
        });
      },
    }),

    brandly_status: tool({
      description:
        "Show the current status of a Brandly project — which phase it's in, budget spent, virality score, and artifacts produced.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found. Check the project ID." });
        }
        // L1/L2 fix: provide defaults for fields that may be undefined
        const costSummary = await costTracker.getSummary(args.projectID);
        return JSON.stringify({
          projectName: state.productName,
          phase: state.currentPhase,
          creditsSpent: state.creditsSpent ?? 0,
          budgetCredits: state.budgetCredits ?? 0,
          budgetRemaining: (state.budgetCredits ?? 0) - (state.creditsSpent ?? 0),
          viralityScore: state.viralityScore ?? null,
          shots: state.shots?.length ?? 0,
          finalCut: state.finalCutPath ?? null,
          publishPaths: state.publishPaths ?? {},
          costLog: (state.costLog ?? []).slice(-5),
          costSummary,
        });
      },
    }),

    brandly_approve: tool({
      description:
        "Approve the current phase output and advance the pipeline to the next phase. Must be called after each agent completes to proceed.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
        phase: tool.schema
          .enum(["init", "trends", "concept", "script", "asset", "audio", "re_edit", "validate", "publish", "done"])
          .describe("The phase being approved"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found. Check the project ID." });
        }

        const phaseLiteral = state.currentPhase as typeof PHASE_ORDER[number];
        const currentIdx = PHASE_ORDER.indexOf(phaseLiteral);
        const approvedIdx = PHASE_ORDER.indexOf(args.phase as typeof PHASE_ORDER[number]);

        if (approvedIdx === -1) {
          return JSON.stringify({ error: `Unknown phase "${args.phase}".` });
        }
        if (approvedIdx !== currentIdx) {
          return JSON.stringify({
            error: `Cannot approve phase "${args.phase}" — current phase is "${state.currentPhase}".`,
          });
        }

        if (currentIdx < PHASE_ORDER.length - 1) {
          state.currentPhase = PHASE_ORDER[currentIdx + 1];
        } else {
          state.currentPhase = "done";
        }

        await writeProject(args.projectID, state);
        await logAction(args.projectID, "phase_approved", `${args.phase} → ${state.currentPhase}`);

        // H5 fix: record project completion when pipeline reaches "done"
        if (state.currentPhase === "done") {
          await memory.recordProjectCompletion(
            state.id,
            state.creditsSpent ?? 0,
            state.style ?? "cinematic"
          );
        }

        return JSON.stringify({
          status: "approved",
          nextPhase: state.currentPhase,
          message: `Phase "${args.phase}" approved. Pipeline advancing to "${state.currentPhase}".`,
        });
      },
    }),

    brandly_run_project: tool({
      description:
        "Run the next phase of the Brandly pipeline. Reads the current phase and dispatches the appropriate agent subagent. Call after brandly_approve to advance the pipeline.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found. Check the project ID." });
        }

        const currentPhase = state.currentPhase;

        if (currentPhase === "done") {
          return JSON.stringify({
            error: `Pipeline is complete. No more phases to run.`,
          });
        }

        // C5 fix: validate phase is handled by brandly_validate, not a subagent
        if (currentPhase === "validate") {
          return JSON.stringify({
            error: `Phase "validate" must be run using brandly_validate, not brandly_run_project.`,
          });
        }

        // C1 fix: budget check before expensive phases
        const estimatedCost = getPhaseCostEstimate(currentPhase, state);
        const expensivePhases = ["asset", "audio", "re_edit", "validate"];
        if (expensivePhases.includes(currentPhase) && estimatedCost > 0) {
          const budget = await costTracker.canAfford(args.projectID, estimatedCost);
          if (!budget.allowed) {
            return JSON.stringify({
              error: `Budget exhausted. Phase "${currentPhase}" needs ~${estimatedCost} credits, but only ${budget.remaining} remain. ${state.creditsSpent}/${state.budgetCredits} credits spent.`,
              estimatedCost,
              budgetRemaining: budget.remaining,
            });
          }
        }

        const agentFile = PHASE_AGENT_MAP[currentPhase];
        if (!agentFile) {
          return JSON.stringify({
            error: `No agent for phase "${currentPhase}". Use brandly_approve first.`,
          });
        }

        const agentPath = join(AGENT_DIR, agentFile);
        let agentPrompt: string;
        try {
          agentPrompt = await readFile(agentPath, "utf-8");
        } catch {
          return JSON.stringify({ error: `Agent file "${agentFile}" not found at ${agentPath}.` });
        }

        const artifactPaths = getArtifactPathsForPhase(currentPhase, args.projectID);

        // Build context for the agent
        const agentContext = `## Project: ${state.productName}
## Idea: ${state.idea ?? "N/A"}
## Platforms: ${(state.targetPlatforms ?? []).join(", ")}
## Budget: ${state.budgetCredits ?? 0} credits (${state.creditsSpent ?? 0} spent)
## Current Phase: ${currentPhase}
## Style: ${state.style ?? "auto-detect from trends"}

${state.imagePath ? `## Product Image: ${state.imagePath}` : ""}
${state.imageAnalysis ? `## Image Analysis Available: Yes (see project state)` : ""}

## Previous Artifacts
${state.viralityReport ? `- Virality report: ${state.viralityReport}` : "- No virality report yet"}
${(state.shots?.length ?? 0) > 0 ? `- Shots defined: ${state.shots.length}` : "- No shots yet"}
${state.finalCutPath ? `- Final cut: ${state.finalCutPath}` : "- No final cut yet"}

## Artifact Save Paths
After the subagent completes, save its output to these paths using the write tool:
${Object.entries(artifactPaths).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## Generated File Output Paths
Save generated binary files (images, videos, audio) to these directories:
- Images: ${getImagenDir(args.projectID)}
- Videos: ${getVideogenDir(args.projectID)}
- Audio: ${getAudgenDir(args.projectID)}

## Project State File
${getProjectPath(args.projectID)}

## Instructions
${agentPrompt}
`;

        // M3 fix: return object, not JSON.stringify
        const dispatchInstructions = {
          phase: currentPhase,
          agent: agentFile,
          dispatch: {
            description: `Brandly ${currentPhase} agent for "${state.productName}"`,
            prompt: agentContext,
            subagentType: "general",
          },
          saveArtifacts: artifactPaths,
          message: `Phase "${currentPhase}" ready. Dispatch the ${agentFile} subagent using the task tool. After it completes, save its markdown output to the artifact paths using the Write tool.`,
        };

        await logAction(args.projectID, `phase_${currentPhase}_started`, agentFile);

        return JSON.stringify(dispatchInstructions);
      },
    }),

    brandly_estimate: tool({
      description:
        "Estimate credit cost before starting a Brandly project. Shows a breakdown by phase so you can decide on budget.",
      args: {
        idea: tool.schema.string().describe("Product idea"),
        productName: tool.schema.string().describe("Product name"),
        style: tool.schema
          .enum(["cinematic", "ugc", "montage", "multi_shot", "continuous", "unboxing", "lifestyle"])
          .optional()
          .describe("Video style"),
        shotCount: tool.schema.number().gte(3).lte(10).default(5).describe("Number of shots"),
      },
      execute: async (args, ctx) => {
        const styleCosts: Record<string, number> = {
          cinematic: 35,
          ugc: 25,
          montage: 20,
          multi_shot: 30,
          continuous: 40,
          unboxing: 25,
          lifestyle: 30,
        };
        const costPerShot = styleCosts[args.style ?? "cinematic"] ?? 30;
        const shotCount = args.shotCount;

        // M7 fix: add validate cost to estimate
        const estimate = {
          concept: 0,
          script: 0,
          asset: shotCount * costPerShot,
          audio: 30,
          validate: 15,
          publish: 0,
          total: shotCount * costPerShot + 30 + 15,
        };

        return JSON.stringify({
          productName: args.productName,
          style: args.style ?? "cinematic",
          shotCount,
          costPerShot,
          estimate,
          recommendation:
            estimate.total > 300
              ? "Consider reducing shot count or using UGC style to save credits"
              : "Budget looks reasonable for this scope",
        });
      },
    }),

    brandly_re_edit: tool({
      description:
        "Re-edit a specific shot in the project. Provide the shot ID and a new prompt/description. The pipeline will regenerate that shot.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
        shotId: tool.schema.number().describe("The shot ID to re-edit"),
        newPrompt: tool.schema.string().describe("New prompt for the shot"),
        reason: tool.schema.string().describe("Why you're re-editing this shot"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found." });
        }

        const shot = state.shots?.find((s: Shot) => s.id === args.shotId);
        if (!shot) {
          return JSON.stringify({
            error: `Shot ${args.shotId} not found. Available: ${(state.shots ?? []).map((s: Shot) => s.id).join(", ")}`,
          });
        }

        // H4 fix: save old prompt BEFORE overwriting
        const oldPrompt = shot.prompt ?? "";

        state.reEditTarget = args.shotId;
        state.reEditHistory.push({
          shotId: args.shotId,
          timestamp: new Date().toISOString(),
          reason: args.reason,
          creditsSpent: 0,
        });

        shot.prompt = args.newPrompt;
        shot.renderPath = undefined;
        shot.qualityScore = undefined;

        state.currentPhase = "re_edit";
        await writeProject(args.projectID, state);
        await logAction(args.projectID, "re_edit", `Shot ${args.shotId}: ${args.reason}`);

        return JSON.stringify({
          shotId: args.shotId,
          oldPrompt,
          newPrompt: args.newPrompt,
          reason: args.reason,
          message: `Shot ${args.shotId} queued for re-edit. Call brandly_run_project to regenerate.`,
        });
      },
    }),

    brandly_validate: tool({
      description:
        "Run virality validation on the final video. Calls Higgsfield virality predictor to score the video and suggest improvements. Updates the project's viralityScore in state.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
        videoPath: tool.schema.string().describe("Path to the rendered video"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        // H6 fix: readProject returns null, not throw
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found. Check the project ID." });
        }

        if (state.currentPhase !== "validate") {
          return JSON.stringify({
            error: `Cannot validate: current phase is "${state.currentPhase}". Reach the validate phase first (e.g. by approving audio).`,
          });
        }

        if (!isPathAllowed(args.videoPath)) {
          return JSON.stringify({
            error: `Invalid videoPath: must be an http(s) URL or an absolute/relative path inside the workspace. Paths containing ".." or absolute paths outside the workspace are not allowed.`,
          });
        }

        const platforms = state.targetPlatforms ?? ["tiktok", "instagram"];

        const mcpCall = {
          tool: "higgsfield_virality_predictor",
          params: {
            action: "create",
            params: {
              model: "virality_predictor",
              medias: [
                {
                  role: "video",
                  id: args.videoPath,
                },
              ],
            },
          },
          afterResult: {
            updateProjectField: "viralityScore",
            projectID: args.projectID,
            scoreThreshold: 7,
          },
        };

        state.currentPhase = "publish";
        await writeProject(args.projectID, state);
        await logAction(args.projectID, "validate_started", args.videoPath);

        // M4 fix: return object, not JSON.stringify
        return JSON.stringify({
          instruction: "Call the Higgsfield virality predictor MCP tool with these params",
          mcpCall,
          message: `Validate video at ${args.videoPath}. After getting the score, update the project's viralityScore field. Pipeline advanced to "publish".`,
        });
      },
    }),

    brandly_memory: tool({
      description:
        "View or update your Brandly preferences. Like/dislike hooks, set preferred style, or reset memory.",
      args: {
        action: tool.schema.enum(["view", "like_hook", "dislike_hook", "reset"]).describe("Action to perform"),
        hook: tool.schema.string().optional().describe("Hook text to like or dislike"),
      },
      execute: async (args, ctx) => {
        if (args.action !== "view") {
          await ensureBaseDirs();
        }
        switch (args.action) {
          case "view": {
            const prefs = await memory.getPreferences();
            return JSON.stringify({
              preferredStyle: prefs.preferredStyle,
              preferredModel: prefs.preferredModel,
              likedHooks: prefs.likedHooks,
              dislikedHooks: prefs.dislikedHooks,
              projectCount: prefs.projectCount,
              avgBudgetUsage: Math.round(prefs.avgBudgetUsage * 100) / 100,
              memoryFile: join(BRANDLY_DIR, "memory.json"),
            });
          }
          case "like_hook": {
            if (!args.hook) return JSON.stringify({ error: "Hook text required" });
            await memory.likeHook(args.hook);
            return JSON.stringify({ message: `Liked hook: "${args.hook}"` });
          }
          case "dislike_hook": {
            if (!args.hook) return JSON.stringify({ error: "Hook text required" });
            await memory.dislikeHook(args.hook);
            return JSON.stringify({ message: `Disliked hook: "${args.hook}"` });
          }
          case "reset": {
            await memory.reset();
            return JSON.stringify({ message: "Memory reset to defaults." });
          }
          default:
            return JSON.stringify({ error: `Unknown action: ${args.action}` });
        }
      },
    }),

    brandly_analyze_image: tool({
      description:
        "Deep-analyze any image — extracts subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction. Returns structured JSON that feeds every downstream agent. Use on any input image before starting a project.",
      args: {
        imagePath: tool.schema
          .string()
          .describe("URL, local file path, or media_id of the image to analyze"),
        projectID: tool.schema.string().optional().describe("Optional project UUID — if provided, stores analysis in project state"),
        context: tool.schema.string().optional().describe("Optional user brief or product idea to help frame the analysis"),
      },
      execute: async (args, ctx) => {
        if (!isPathAllowed(args.imagePath)) {
          return JSON.stringify({
            error: `Invalid imagePath: must be an http(s) URL or an absolute/relative path inside the workspace. Paths containing ".." or absolute paths outside the workspace are not allowed.`,
          });
        }

        const agentPath = join(AGENT_DIR, "image_analyzer.md");
        let agentPrompt: string;
        try {
          agentPrompt = await readFile(agentPath, "utf-8");
        } catch {
          return JSON.stringify({ error: `Agent file "image_analyzer.md" not found at ${agentPath}.` });
        }

        const analysisPath = args.projectID ? getAnalysisPath(args.projectID) : null;

        const agentContext = `## Image to Analyze
${args.imagePath}

${args.context ? `## User Brief\n${args.context}` : ""}

## Instructions
${agentPrompt}

## IMPORTANT
You have access to MCP tools. If the image is a URL, you may use magnific_creations_upload_image or higgsfield_media_import_url to ingest it first if needed.
Analyze the image exhaustively. Return the JSON object as specified in the output format.

## Save Your Output
After returning the JSON analysis, ALSO save a human-readable markdown version to this path:
${analysisPath ?? "No project — skip saving"}

Write the markdown file with these sections:
- # Image Analysis
- ## Subject & Product (what's in the image)
- ## Visual Composition (layout, framing, depth)
- ## Lighting & Color (palette, mood, technique)
- ## Style & Aesthetic (genre, references)
- ## Platform Suitability (which platforms, why)
- ## Creative Direction (actionable guidance for downstream agents)
`;

        const dispatchInstructions = {
          phase: "image_analysis",
          agent: "image_analyzer.md",
          dispatch: {
            description: `Brandly image analysis for ${args.imagePath}`,
            prompt: agentContext,
            subagentType: "general",
          },
          storeResult: args.projectID
            ? { projectID: args.projectID, field: "imageAnalysis" }
            : undefined,
          saveArtifact: analysisPath
            ? { projectID: args.projectID, path: analysisPath }
            : undefined,
          message: `Dispatch the image_analyzer.md subagent using the task tool. After it completes, save its markdown output to ${analysisPath ?? "skip"}.`,
        };

        if (args.projectID) {
          if (!isValidProjectId(args.projectID)) {
            return JSON.stringify({ error: "Invalid project ID format." });
          }
          const state = await readProject(args.projectID);
          if (state) {
            state.imageAnalysisPending = true;
            state.imagePath = args.imagePath;
            await writeProject(args.projectID, state);
            await logAction(args.projectID, "image_analysis_started", args.imagePath);
          }
        }

        return JSON.stringify(dispatchInstructions);
      },
    }),

    // ── NEW: brandly_record_cost — C1 fix ──

    brandly_record_cost: tool({
      description:
        "Record actual credit spend for a phase operation. Call this after any MCP generation tool completes to track real costs against the project budget.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
        phase: tool.schema.string().describe("Pipeline phase that incurred the cost"),
        action: tool.schema.string().describe("What the credits were spent on"),
        credits: tool.schema.number().gt(0).describe("Credits spent"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        try {
          const result = await costTracker.recordSpend(
            args.projectID,
            args.phase,
            args.action,
            args.credits
          );
          await logAction(args.projectID, "cost_recorded", `${args.phase}/${args.action}: ${args.credits} cr`);
          return JSON.stringify({
            recorded: args.credits,
            newTotal: result.newTotal,
            remaining: result.remaining,
            message: `Recorded ${args.credits} credits for ${args.action}. Total: ${result.newTotal}, Remaining: ${result.remaining}.`,
          });
        } catch (error: any) {
          return JSON.stringify({ error: error.message ?? "Failed to record cost." });
        }
      },
    }),

    // ── NEW: brandly_save_artifact — H7 fix ──

    brandly_save_artifact: tool({
      description:
        "Save a subagent's output to the .brandly project folder. Call this after a subagent completes to persist its markdown/json output for reusability.",
      args: {
        projectID: tool.schema.string().describe("The project UUID"),
        category: tool.schema
          .enum(["analysis", "script", "storyboard", "assets", "audio"])
          .describe("Artifact category folder in .brandly/projects/{id}/"),
        filename: tool.schema.string().describe("Filename to save as (e.g. 'script.md', 'asset-plan.json')"),
        content: tool.schema.string().describe("The text content to save"),
      },
      execute: async (args, ctx) => {
        if (!isValidProjectId(args.projectID)) {
          return JSON.stringify({ error: "Invalid project ID format." });
        }
        const state = await readProject(args.projectID);
        if (!state) {
          return JSON.stringify({ error: "Project not found." });
        }
        try {
          await writeArtifact(args.projectID, args.category, args.filename, args.content);
          await logAction(args.projectID, "artifact_saved", `${args.category}/${args.filename}`);
          return JSON.stringify({
            saved: true,
            path: join(getArtifactDir(args.projectID, args.category), args.filename),
            message: `Artifact saved to .brandly/projects/${args.projectID}/${args.category}/${args.filename}`,
          });
        } catch (error: any) {
          return JSON.stringify({ error: error.message ?? "Failed to save artifact." });
        }
      },
    }),

    // ── NEW: brandly_list_projects ──

    brandly_list_projects: tool({
      description:
        "List all Brandly projects in the .brandly folder. Shows project name, phase, budget, and creation date.",
      args: {},
      execute: async (args, ctx) => {
        try {
          const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
          const projects: any[] = [];
          for (const entry of entries) {
            if (!entry.isDirectory() || !UUID_RE.test(entry.name)) continue;
            const state = await readProject(entry.name);
            if (state) {
              projects.push({
                id: state.id,
                productName: state.productName,
                phase: state.currentPhase,
                creditsSpent: state.creditsSpent ?? 0,
                budgetCredits: state.budgetCredits ?? 0,
                createdAt: state.createdAt,
              });
            }
          }
          return JSON.stringify({
            count: projects.length,
            projects: projects.sort((a, b) =>
              (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
            ),
          });
        } catch {
          return JSON.stringify({ count: 0, projects: [], message: "No .brandly folder yet." });
        }
      },
    }),
  };

  return {
    tool: tools,
    "command.execute.before": async (input) => {
      if (input.command === "brandly") {
        await ensureBaseDirs();
      }
    },
  };
};

export default BrandlyPlugin;
