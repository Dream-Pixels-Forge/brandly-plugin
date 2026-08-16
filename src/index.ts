import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { createContext } from "./tools/context"
import { createStartTool } from "./tools/start"
import { createStatusTool } from "./tools/status"
import { createApproveTool } from "./tools/approve"
import { createRunTool } from "./tools/run"
import { createEstimateTool } from "./tools/estimate"
import { createReEditTool } from "./tools/re_edit"
import { createValidateTool } from "./tools/validate"
import { createMemoryTool } from "./tools/memory"
import { createImageTool } from "./tools/image"
import { createCostTool } from "./tools/cost"
import { createArtifactTool } from "./tools/artifact"
import { createTemplatesTool } from "./tools/templates"
import { createCancelTool } from "./tools/cancel"
import { createProgressTool } from "./tools/progress"
import { createExportTool } from "./tools/export"
import { createDownloadTool } from "./tools/download"
import { createProviderTool } from "./tools/provider"
import { createVideoEditTool } from "./tools/video-edit"
import { createVideoRenderTool } from "./tools/video-render"
import { createAssemblyTool } from "./tools/assembly"
import { createBrandKitTool } from "./tools/brand-kit"
import { createBatchVariationsTool } from "./tools/batch-variations"
import { createAutoCaptionTool } from "./tools/auto-caption"
import { createSceneConsistencyTool } from "./tools/scene-consistency"
import { createCharacterConsistencyTool } from "./tools/character-consistency"
import { createMotionGraphicsTool } from "./tools/motion-graphics"
import { createDashboardTool } from "./tools/dashboard"

const DIRECTOR_MODE_PROMPT = `You are now in **Brandly Director Mode** — an autonomous video production pipeline.

## Your Role
You are the **Director**. Your job is to guide the creation of a professional product video from concept to final render using the Brandly toolset.

## Immediate Actions
1. Ask the user for their **product name** and **product idea** (what it is, key features, selling points)
2. Ask about **video style** preference: cinematic, ugc, montage, multi_shot, continuous, unboxing, lifestyle, collage_motion_graphic, brand_short_video, or explainer_video
3. Ask about **target platforms** (TikTok, Instagram, YouTube, or all)
4. Ask about **budget** (max credits to spend, default 500)
5. Once you have this info, immediately call \`brandly_start\` to create the project

## Director Workflow
After project initialization, follow this phase pipeline:
1. **trends** — Research trending styles for this product category
2. **concept** — Create creative concept and mood board
3. **script** — Write shot-by-shot script with timing
4. **asset** — Generate/source visual assets
5. **audio** — Create music, SFX, voiceover
6. **re_edit** — Review and refine
7. **validate** — Quality checks and virality scoring
8. **publish** — Export final video with captions

## Dashboard
When the user asks to **see information**, **view progress**, **check status**, **open dashboard**, or any similar request to visualize the project:
- Call \`brandly_dashboard\` with action="open" to start the dashboard and get the URL
- The dashboard shows real-time pipeline, virality scores, costs, artifacts, and history
- If already running, it returns the existing URL

## Rules
- Check \`brandly_status\` before each phase
- Use \`brandly_estimate\` to check budget before expensive operations
- Get user approval via \`brandly_approve\` before proceeding
- Record costs with \`brandly_record_cost\` after paid operations
- Save artifacts with \`brandly_save_artifact\`
- Track decisions with \`brandly_memory\`
- When user wants to see project info, run \`brandly_dashboard\`

## Communication Style
- Be concise and action-oriented
- Show progress after each phase
- Present options, let user decide on creative direction
- Explain what you're about to do before doing it

**Start by greeting the user and asking for their product information.**`

export const BrandlyPlugin: Plugin = async (input) => {
  const { directory } = input
  const ctx = createContext(directory)

  return {
    tool: {
      brandly_start: createStartTool(ctx),
      brandly_status: createStatusTool(ctx),
      brandly_approve: createApproveTool(ctx),
      brandly_run: createRunTool(ctx),
      brandly_estimate: createEstimateTool(ctx),
      brandly_re_edit: createReEditTool(ctx),
      brandly_validate: createValidateTool(ctx),
      brandly_memory: createMemoryTool(ctx),
      brandly_analyze_image: createImageTool(ctx),
      brandly_record_cost: createCostTool(ctx),
      brandly_save_artifact: createArtifactTool(ctx),
      brandly_templates: createTemplatesTool(ctx),
      brandly_cancel: createCancelTool(ctx),
      brandly_progress: createProgressTool(ctx),
      brandly_export: createExportTool(ctx),
      brandly_download: createDownloadTool(ctx),
      brandly_select_provider: createProviderTool(ctx),
      brandly_video_edit: createVideoEditTool(ctx),
      brandly_render_video: createVideoRenderTool(ctx),
      brandly_assemble: createAssemblyTool(ctx),
      brandly_brand_kit: createBrandKitTool(ctx),
      brandly_batch_variations: createBatchVariationsTool(ctx),
      brandly_auto_caption: createAutoCaptionTool(ctx),
      brandly_scene_consistency: createSceneConsistencyTool(ctx),
      brandly_character_consistency: createCharacterConsistencyTool(ctx),
      brandly_motion_graphics: createMotionGraphicsTool(ctx),
      brandly_dashboard: createDashboardTool(ctx),
    },

    "command.execute.before": async (input, output) => {
      const { command, arguments: args } = input

      if (command === "brandly" && args.trim() === "init") {
        output.parts = [
          {
            type: "text",
            text: DIRECTOR_MODE_PROMPT,
          },
        ]
      }
    },
  }
}
