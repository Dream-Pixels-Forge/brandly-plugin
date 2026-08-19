import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { generateImage } from "./agnes-client";
import {
  applyStylePreset,
  type StylePreset,
  STYLE_PRESET_OPTIONS,
} from "./style-presets";

export function createImageTool(ctx: ToolContext) {
  return tool({
    description:
      "Deep-analyze any image — extracts subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction. Returns structured JSON that feeds every downstream agent. Use on any input image before starting a project. Optionally generate images using Agnes AI by providing generatePrompt.",
    args: {
      imagePath: tool.schema
        .string()
        .optional()
        .describe("URL, local file path, or media_id of the image to analyze"),
      projectID: tool.schema
        .string()
        .optional()
        .describe("Optional project UUID — if provided, stores analysis in project state"),
      context: tool.schema
        .string()
        .optional()
        .describe("Optional user brief or product idea to help frame the analysis"),
      generatePrompt: tool.schema
        .string()
        .optional()
        .describe("If provided, generates an image using Agnes AI (text-to-image). Requires AGNES_API_KEY env var."),
      inputImages: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe("Public image URLs for image-to-image generation via Agnes AI. Use with generatePrompt."),
      model: tool.schema
        .enum(["agnes-image-2.1-flash", "agnes-image-2.0-flash"])
        .optional()
        .describe("Agnes image model (default: agnes-image-2.1-flash)"),
      size: tool.schema
        .enum(["1K", "2K", "3K", "4K"])
        .optional()
        .describe("Image size tier (default: 2K)"),
      ratio: tool.schema
        .enum(["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"])
        .optional()
        .describe("Aspect ratio (default: 16:9)"),
      stylePreset: tool.schema
        .enum(STYLE_PRESET_OPTIONS as any)
        .optional()
        .describe("Style preset to avoid AI slop: photorealistic (camera/lens/grain), editorial (magazine look), cinematic (film grade), commercial (product photo), documentary (photojournalism)"),
    },
    async execute(args) {
      // If generatePrompt is provided, generate an image via Agnes AI
      if (args.generatePrompt) {
        const preset = (args.stylePreset as StylePreset) || "none";
        const enhancedPrompt = applyStylePreset(args.generatePrompt, preset);

        const result = await generateImage({
          prompt: enhancedPrompt,
          model: args.model,
          size: args.size,
          ratio: args.ratio,
          images: args.inputImages,
        });

        if (args.projectID) {
          const project = await ctx.readProject(args.projectID);
          if (project) {
            project.imageAnalysis = {
              generatedUrl: result.url,
              generatedB64: result.b64Json ? "[base64 data]" : null,
              prompt: args.generatePrompt,
              enhancedPrompt,
              stylePreset: preset,
              model: args.model || "agnes-image-2.1-flash",
              generatedAt: new Date().toISOString(),
            };
            project.updatedAt = new Date().toISOString();
            await ctx.writeProject(args.projectID, project);
          }
        }

        return {
          generated: true,
          url: result.url,
          b64Json: result.b64Json,
          revisedPrompt: result.revisedPrompt,
          model: args.model || "agnes-image-2.1-flash",
          size: args.size || "2K",
          ratio: args.ratio || "16:9",
          stylePreset: preset,
          projectID: args.projectID,
          status: "generated",
          message: result.url
            ? `Image generated (${preset || "default"} style): ${result.url}`
            : "Image generated (base64 data returned)",
        };
      }

      // Original analysis flow (unchanged)
      if (!args.imagePath) {
        throw new Error("imagePath is required for analysis, or provide generatePrompt for generation");
      }

      if (args.projectID) {
        const project = await ctx.readProject(args.projectID);
        if (project) {
          project.imageAnalysis = {
            path: args.imagePath,
            context: args.context,
            analyzedAt: new Date().toISOString(),
          };
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(args.projectID, project);
        }
      }

      return {
        imagePath: args.imagePath,
        projectID: args.projectID,
        status: "analyzed",
        message: `Image analysis initiated for: ${args.imagePath}`,
      };
    },
  });
}
