import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";
import {
  createVideoTask,
  pollVideo,
  type AgnesVideoMode,
} from "./agnes-client";
import {
  applyStylePreset,
  getNegativePrompt,
  type StylePreset,
  STYLE_PRESET_OPTIONS,
} from "./style-presets";

export function createVideoGenerateTool(ctx: ToolContext) {
  return tool({
    description:
      "Generate AI video using Agnes AI models. Supports text-to-video, image-to-video (keyframe mode), and reference-based generation. Creates an async task, polls until complete, and returns the video URL.",
    args: {
      projectID: tool.schema
        .string()
        .describe("The project UUID"),
      prompt: tool.schema
        .string()
        .describe("Text description of the video content"),
      model: tool.schema
        .enum(["agnes-video-v2.0", "agnes-video-2.5"])
        .optional()
        .describe("Agnes video model to use (default: agnes-video-v2.0)"),
      mode: tool.schema
        .enum(["text", "keyframe", "reference"])
        .optional()
        .describe("Generation mode: text (text-to-video), keyframe (first/last frame control), reference (image/audio/video reference)"),
      duration: tool.schema
        .number()
        .optional()
        .describe("Video duration in seconds. v2.0: controls num_frames at 24fps. v2.5: 4-12 seconds"),
      aspectRatio: tool.schema
        .enum(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"])
        .optional()
        .describe("Output aspect ratio (default: 16:9)"),
      firstFrame: tool.schema
        .string()
        .optional()
        .describe("Public image URL for first frame (keyframe mode only)"),
      lastFrame: tool.schema
        .string()
        .optional()
        .describe("Public image URL for last frame (keyframe mode only)"),
      referenceImages: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe("Public image URLs for reference mode"),
      referenceAudios: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe("Public audio URLs for reference mode"),
      seed: tool.schema
        .number()
        .optional()
        .describe("Random seed for reproducible results"),
      stylePreset: tool.schema
        .enum(STYLE_PRESET_OPTIONS as any)
        .optional()
        .describe("Style preset to avoid AI slop: photorealistic (camera/lens/grain), editorial (magazine look), cinematic (film grade), commercial (product photo), documentary (photojournalism)"),
      negativePrompt: tool.schema
        .string()
        .optional()
        .describe("Negative prompt to avoid unwanted content. If stylePreset is set, a default negative prompt is auto-applied unless you override this."),
      maxWaitSeconds: tool.schema
        .number()
        .optional()
        .describe("Max seconds to wait for generation (default: 300)"),
    },
    async execute(args) {
      if (!isValidProjectId(args.projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(args.projectID);
      if (!project) {
        throw new Error(`Project not found: ${args.projectID}`);
      }

      const mode: AgnesVideoMode = (args.mode as AgnesVideoMode) || "text";
      const preset = (args.stylePreset as StylePreset) || "none";
      const enhancedPrompt = applyStylePreset(args.prompt, preset);
      const negativePrompt =
        args.negativePrompt || getNegativePrompt(preset);

      if (mode === "keyframe" && !args.firstFrame && !args.lastFrame) {
        throw new Error("keyframe mode requires at least one of firstFrame or lastFrame");
      }

      if (
        mode === "reference" &&
        (!args.referenceImages || args.referenceImages.length === 0) &&
        (!args.referenceAudios || args.referenceAudios.length === 0)
      ) {
        throw new Error("reference mode requires at least one of referenceImages or referenceAudios");
      }

      // Create the video task
      const task = await createVideoTask({
        prompt: enhancedPrompt,
        model: args.model,
        mode,
        seconds: args.duration,
        aspectRatio: args.aspectRatio,
        seed: args.seed,
        negativePrompt: negativePrompt || undefined,
        firstFrame: args.firstFrame,
        lastFrame: args.lastFrame,
        images: args.referenceImages,
        audios: args.referenceAudios,
      });

      // Poll until complete
      const maxWaitMs = (args.maxWaitSeconds || 300) * 1000;
      const result = await pollVideo(task.videoId, maxWaitMs);

      // Store result in project phase
      if (!project.phases) {
        project.phases = {};
      }

      const currentPhase = project.currentPhase as string;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }

      const phaseOutput = project.phases[currentPhase].output
        ? JSON.parse(project.phases[currentPhase].output || "{}")
        : {};

      if (!phaseOutput.videoGenerations) {
        phaseOutput.videoGenerations = [];
      }

      phaseOutput.videoGenerations.push({
        taskId: task.id,
        videoId: task.videoId,
        model: args.model || "agnes-video-v2.0",
        mode,
        prompt: args.prompt,
        enhancedPrompt,
        stylePreset: preset,
        negativePrompt: negativePrompt || null,
        url: result.url,
        duration: args.duration || 5,
        aspectRatio: args.aspectRatio || "16:9",
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(args.projectID, project);

      return {
        projectId: args.projectID,
        taskId: task.id,
        videoId: task.videoId,
        model: args.model || "agnes-video-v2.0",
        mode,
        stylePreset: preset,
        status: result.status,
        url: result.url,
        duration: args.duration || 5,
        aspectRatio: args.aspectRatio || "16:9",
        message: result.url
          ? `Video generated (${preset || "default"} style): ${result.url}`
          : `Video task completed with status: ${result.status}`,
      };
    },
  });
}
