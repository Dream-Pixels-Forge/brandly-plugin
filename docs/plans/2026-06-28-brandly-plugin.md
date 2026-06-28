# Brandly — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build an opencode plugin that orchestrates specialized agents to produce viral-ready product marketing videos from a single idea or image, with strict cost control.

**Architecture:** Plugin registers a `brandly` command and custom tools. A main orchestrator agent delegates to subagents (Trends, Concept, Script, Asset, Publish) via opencode's `task` tool. Shared state lives in `.brandly/` project directory. MCP connections to Higgsfield and Magnific handle media generation.

**Tech Stack:** TypeScript (opencode plugin SDK), Bun runtime, opencode task tool for subagent delegation, Higgsfield MCP (video/image gen), Magnific MCP (image gen/upscaling), websearch for trend analysis.

---

## Phase 0: Scaffold & Infrastructure

### Task 0.1: Create plugin directory structure

**Objective:** Set up the plugin package with correct opencode plugin layout.

**Files:**
- Create: `plugins/brandly/package.json`
- Create: `plugins/brandly/tsconfig.json`
- Create: `plugins/brandly/src/index.ts`
- Create: `plugins/brandly/src/types.ts`

**Step 1: Create package.json**

```json
{
  "name": "brandly",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun",
    "dev": "bun --watch src/index.ts"
  },
  "dependencies": {
    "@opencode-ai/plugin": "1.1.39",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 3: Create types.ts with shared state schema**

```typescript
import { z } from "zod";

// --- Enums ---
export const InputType = z.enum(["idea", "image", "video", "idea_with_image"]);
export type InputType = z.infer<typeof InputType>;

export const VideoStyle = z.enum([
  "cinematic",
  "ugc",
  "montage",
  "multi_shot",
  "continuous",
  "unboxing",
  "lifestyle",
]);
export type VideoStyle = z.infer<typeof VideoStyle>;

export const Platform = z.enum(["tiktok", "instagram", "youtube", "all"]);
export type Platform = z.infer<typeof Platform>;

// --- Shot ---
export const ShotSchema = z.object({
  id: z.number(),
  duration: z.number().describe("Seconds"),
  description: z.string(),
  cameraMovement: z.string().optional(),
  lighting: z.string().optional(),
  style: z.string().optional(),
  subject: z.string().optional(),
  environment: z.string().optional(),
  prompt: z.string().optional().describe("Generated prompt for this shot"),
  renderPath: z.string().optional().describe("Path to rendered video file"),
  qualityScore: z.number().optional().describe("0-10 quality score"),
  model: z.string().optional().describe("Which model generated this"),
});
export type Shot = z.infer<typeof ShotSchema>;

// --- Project State ---
export const ProjectState = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Input
  inputType: InputType,
  idea: z.string().optional(),
  imagePath: z.string().optional(),
  videoPath: z.string().optional(),

  // Config
  productName: z.string(),
  targetPlatforms: z.array(Platform),
  style: VideoStyle.optional(),
  budgetCredits: z.number().positive(),
  creditsSpent: z.number().default(0),

  // Pipeline state
  currentPhase: z.enum([
    "init",
    "estimating",
    "trends",
    "concept",
    "preview",
    "script",
    "asset",
    "validate",
    "publish",
    "done",
    "failed",
    "re_edit",
  ]),
  viralityScore: z.number().min(0).max(10).optional(),
  postGenViralityScore: z.number().min(0).max(10).optional(),

  // Artifacts
  viralityReport: z.string().optional().describe("Path to virality_report.md"),
  storyboardPath: z.string().optional(),
  shots: z.array(ShotSchema).default([]),
  finalCutPath: z.string().optional(),
  publishPaths: z.record(z.string()).optional(),

  // Preview mode
  previewMode: z.boolean().default(true).describe("Generate low-res previews first"),
  previewPaths: z.record(z.string()).optional().describe("Preview renders per shot"),
  previewApproved: z.boolean().default(false),

  // Re-edit state
  reEditTarget: z.number().optional().describe("Shot ID being re-edited"),
  reEditHistory: z
    .array(
      z.object({
        shotId: z.number(),
        timestamp: z.string().datetime(),
        reason: z.string(),
        creditsSpent: z.number(),
      })
    )
    .default([]),

  // User preferences (learned across projects)
  userPreferences: z
    .object({
      preferredStyle: VideoStyle.optional(),
      preferredModel: z.string().optional(),
      preferredDuration: z.number().optional(),
      likedHooks: z.array(z.string()).default([]),
      dislikedHooks: z.array(z.string()).default([]),
      avgBudgetUsage: z.number().optional(),
    })
    .default({}),

  // Audio
  audioTrack: z
    .object({
      path: z.string().optional(),
      style: z.string().optional(),
      source: z.enum(["generated", "suggested", "none"]).default("none"),
    })
    .default({ source: "none" }),

  // Cost log
  costLog: z
    .array(
      z.object({
        phase: z.string(),
        action: z.string(),
        credits: z.number(),
        timestamp: z.string().datetime(),
      })
    )
    .default([]),

  // Upfront estimate
  costEstimate: z
    .object({
      concept: z.number(),
      script: z.number(),
      asset: z.number(),
      audio: z.number(),
      publish: z.number(),
      total: z.number(),
    })
    .optional(),
});
export type ProjectState = z.infer<typeof ProjectState>;
```

**Step 4: Create minimal index.ts**

```typescript
import type { Plugin } from "@opencode-ai/plugin";

const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    config: (cfg) => {
      // Future: inject brandly-specific config
    },
  };
};

export default BrandlyPlugin;
```

**Step 5: Verify build**

Run: `cd plugins/brandly && bun install && bun run build`
Expected: `dist/index.js` created without errors.

**Step 6: Commit**

```bash
git add plugins/brandly/
git commit -m "feat(brandly): scaffold plugin structure with types"
```

---

### Task 0.2: Register plugin in opencode config

**Objective:** Make opencode load the brandly plugin.

**Files:**
- Modify: `~/.config/opencode/opencode.json` — add `"plugin": ["./plugins/brandly"]`

**Step 1: Add plugin entry**

Add to `opencode.json`:
```json
{
  "plugin": ["./plugins/brandly"]
}
```

Note: path is relative to the config directory (`~/.config/opencode/`).

**Step 2: Verify plugin loads**

Restart opencode. Check that the brandly plugin initializes (no startup errors).

**Step 3: Commit**

```bash
git add ~/.config/opencode/opencode.json
git commit -m "feat(brandly): register plugin in opencode config"
```

---

## Phase 1: Core Tools (Plugin Registration)

### Task 1.1: Register `brandly_start` tool

**Objective:** Create the entry-point tool that initializes a project and routes to the orchestrator.

**Files:**
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Add tool definition**

```typescript
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";

const brandlyStart = tool({
  description:
    "Start a Brandly product video project. Provide an idea, image path, or video path. Sets up project state and launches the agent pipeline.",
  args: {
    product_name: z.string().describe("Name of the product"),
    idea: z.string().optional().describe("Product/marketing idea in plain text"),
    image_path: z.string().optional().describe("Path to product image"),
    video_path: z.string().optional().describe("Path to existing video footage"),
    platforms: z
      .array(z.enum(["tiktok", "instagram", "youtube"]))
      .default(["tiktok", "instagram"])
      .describe("Target platforms"),
    style: z
      .enum(["cinematic", "ugc", "montage", "multi_shot", "continuous", "unboxing", "lifestyle"])
      .optional()
      .describe("Video style preference"),
    budget_credits: z
      .number()
      .positive()
      .default(500)
      .describe("Max credits to spend on this project"),
  },
  execute: async (args, ctx) => {
    // 1. Validate inputs
    if (!args.idea && !args.image_path && !args.video_path) {
      return "ERROR: Provide at least one of: idea, image_path, or video_path";
    }

    // 2. Create project directory
    const projectId = crypto.randomUUID();
    const projectDir = `${ctx.directory}/.brandly/${projectId}`;

    await Bun.$`mkdir -p ${projectDir}/storyboard/keyframes`;
    await Bun.$`mkdir -p ${projectDir}/prompts`;
    await Bun.$`mkdir -p ${projectDir}/renders`;
    await Bun.$`mkdir -p ${projectDir}/publish`;

    // 3. Determine input type
    let inputType = "idea";
    if (args.image_path && args.idea) inputType = "idea_with_image";
    else if (args.image_path) inputType = "image";
    else if (args.video_path) inputType = "video";

    // 4. Write initial state
    const state = {
      id: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputType,
      idea: args.idea,
      imagePath: args.image_path,
      videoPath: args.video_path,
      productName: args.product_name,
      targetPlatforms: args.platforms,
      style: args.style,
      budgetCredits: args.budget_credits,
      creditsSpent: 0,
      currentPhase: "init",
      shots: [],
      costLog: [],
    };

    await Bun.write(`${projectDir}/project.json`, JSON.stringify(state, null, 2));

    // 5. Return orchestrator prompt
    return [
      `Brandly project initialized: ${projectDir}`,
      `Product: ${args.product_name}`,
      `Input type: ${inputType}`,
      `Budget: ${args.budget_credits} credits`,
      "",
      "PROJECT STATE: " + `${projectDir}/project.json`,
      "",
      "Now launch the orchestrator. Use the project state to determine which agents to run.",
      "Call task subagents in this order (parallel where possible):",
      "1. Trends Agent → analyze market virality",
      "2. Concept Agent → create storyboard (waits for trends if idea-based)",
      "3. Script Agent → generate prompts from storyboard",
      "4. Asset Agent → generate video shots",
      "5. Publish Agent → platform-optimize final output",
    ].join("\n");
  },
});
```

**Step 2: Register in plugin hooks**

Update `index.ts` to include the tool:

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
    },
  };
};
```

**Step 3: Verify tool appears**

Restart opencode. Run `/tools` or check that `brandly_start` is available.

**Step 4: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add brandly_start tool for project init"
```

---

### Task 1.2: Register `brandly_status` tool

**Objective:** Quick tool to check project state, cost, and phase.

**Files:**
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Add tool**

```typescript
const brandlyStatus = tool({
  description:
    "Check the status of a Brandly project. Shows current phase, credits spent, virality score, and artifacts.",
  args: {
    project_id: z.string().uuid().describe("Project UUID"),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;

    try {
      const stateFile = await Bun.file(statePath).text();
      const state = JSON.parse(stateFile);

      const lines = [
        `=== Brandly Project: ${state.productName} ===`,
        `ID: ${state.id}`,
        `Phase: ${state.currentPhase}`,
        `Input: ${state.inputType}`,
        `Platforms: ${state.targetPlatforms.join(", ")}`,
        `Style: ${state.style || "auto"}`,
        "",
        `Credits: ${state.creditsSpent}/${state.budgetCredits} spent`,
        `Virality Score: ${state.viralityScore ?? "not yet scored"}/10`,
        `Shots: ${state.shots.length} total`,
        "",
        "Artifacts:",
        state.viralityReport ? `  Virality: ${state.viralityReport}` : "  Virality: pending",
        state.storyboardPath ? `  Storyboard: ${state.storyboardPath}` : "  Storyboard: pending",
        state.finalCutPath ? `  Final Cut: ${state.finalCutPath}` : "  Final Cut: pending",
      ];

      if (state.costLog.length > 0) {
        lines.push("", "Cost Breakdown:");
        for (const entry of state.costLog) {
          lines.push(`  [${entry.phase}] ${entry.action}: ${entry.credits} credits`);
        }
      }

      return lines.join("\n");
    } catch {
      return `ERROR: Project ${args.project_id} not found at ${statePath}`;
    }
  },
});
```

**Step 2: Register tool in hooks**

Add `brandly_status: brandlyStatus` to the `tool` object.

**Step 3: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add brandly_status tool"
```

---

### Task 1.3: Register `brandly_approve` tool

**Objective:** Human-in-the-loop gate for approving storyboards, prompts, or budget before proceeding.

**Files:**
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Add tool**

```typescript
const brandlyApprove = tool({
  description:
    "Approve or reject a Brandly pipeline stage. Used for human-in-the-loop gates before expensive operations.",
  args: {
    project_id: z.string().uuid(),
    phase: z.enum(["storyboard", "prompts", "generation", "preview", "final", "audio"]),
    approved: z.boolean(),
    feedback: z.string().optional().describe("Feedback if rejected"),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;
    const stateFile = await Bun.file(statePath).text();
    const state = JSON.parse(stateFile);

    if (!args.approved) {
      state.currentPhase = "failed";
      state.updatedAt = new Date().toISOString();
      await Bun.write(statePath, JSON.stringify(state, null, 2));
      return `Project rejected at ${args.phase} phase. ${args.feedback || "No feedback provided."} Update the project and restart.`;
    }

    // Mark phase approved and advance
    const phaseOrder = [
      "init", "estimating", "trends", "concept", "preview",
      "script", "asset", "validate", "publish", "done",
    ];
    const currentIdx = phaseOrder.indexOf(state.currentPhase);
    if (currentIdx < phaseOrder.length - 1) {
      state.currentPhase = phaseOrder[currentIdx + 1];
    } else {
      state.currentPhase = "done";
    }
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    return `${args.phase} approved. Pipeline advanced to: ${state.currentPhase}`;
  },
});
```

**Step 2: Register tool in hooks**

**Step 3: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add brandly_approve HITL gate tool"
```

---

## Phase 2: Agent Definitions

### Task 2.1: Create Trends Agent prompt file

**Objective:** Define the Trends subagent that analyzes market virality.

**Files:**
- Create: `plugins/brandly/agents/trends-agent.md`

**Step 1: Write agent prompt**

```markdown
---
description: Analyzes market trends and predicts virality for product videos
mode: subagent
---

You are the Brandly Trends Agent. Your job is to research the current market and predict what video format will make this product go viral.

## Input
You receive:
- Product name and description
- Target platforms (TikTok, Instagram, YouTube)
- Any existing reference material

## Your Tasks

### 1. Market Research
Use `websearch` to find:
- Current trending product videos in this category
- Platform-specific algorithm preferences (what's being boosted)
- Competitor video strategies
- Viral hooks and formats working RIGHT NOW

### 2. Trend Analysis
For each trend found, evaluate:
- **Recency**: Is this trending NOW or is it saturated?
- **Platform fit**: Does it match the target platforms?
- **Product fit**: Does this format suit the product type?
- **Virality potential**: Score 1-10 based on hook strength, shareability, emotional trigger

### 3. Reference Analysis
If user provided a video:
- Use `higgsfield_video_analysis` to break down the video structure
- Use `higgsfield_virality_predictor` to score it
- Extract what works and what could improve

### 4. Recommendations
Output a structured report with:
- **Top 3 recommended formats** with rationale
- **Winning hook types** (question, shock, reveal, ASMR, etc.)
- **Optimal duration** per platform
- **Style direction** (cinematic, UGC, minimal, etc.)
- **Virality score prediction** (1-10) for each format
- **Cost estimate** for each approach

## Output Format
Write your report to `{project_dir}/virality_report.md` using this template:

```markdown
# Virality Report: {product_name}

## Executive Summary
[2-3 sentences on recommended approach]

## Trend Analysis
[Current trends in this product category]

## Recommended Formats
### Format 1: {name}
- Platforms: [list]
- Duration: [seconds]
- Virality Score: X/10
- Style: [description]
- Hook: [hook type]
- Why: [rationale]

### Format 2: {name}
...

## Platform-Specific Recommendations
### TikTok
### Instagram Reels
### YouTube Shorts

## Cost Estimate
| Phase | Estimated Credits |
|-------|-------------------|
| Concept | X |
| Script | X |
| Asset Gen | X |
| Total | X |

## Virality Score: X/10
```

## Constraints
- Do NOT generate any images or videos. Research only.
- Stay within budget context provided.
- If budget is tight, recommend cost-effective approaches.
- Always provide actionable, specific recommendations (not generic advice).
```

**Step 2: Commit**

```bash
git add plugins/brandly/agents/trends-agent.md
git commit -m "feat(brandly): add trends agent prompt"
```

---

### Task 2.2: Create Concept Agent prompt file

**Objective:** Define the Concept subagent that creates storyboards and moodboards.

**Files:**
- Create: `plugins/brandly/agents/concept-agent.md`

**Step 1: Write agent prompt**

```markdown
---
description: Creates visual storyboards and moodboards for product videos
mode: subagent
---

You are the Brandly Concept Agent. You transform a product idea + trend data into a concrete visual storyboard.

## Input
You receive:
- Product info (name, description, images)
- Virality report from Trends Agent
- Style preference (if any)
- Project directory path

## Your Tasks

### 1. Moodboard Creation
Using `higgsfield_generate_image` or `magnific_images_generate`:
- Generate 3-5 moodboard concepts that match the recommended trend format
- Each moodboard should capture: color palette, lighting style, environment, mood
- Use product images as reference if available (via `medias` parameter)

### 2. Storyboard Development
Based on the best moodboard:
- Define shot-by-shot sequence (4-8 shots for a 15-30s video)
- For each shot specify:
  - Shot number and duration (seconds)
  - Camera angle and movement
  - Subject placement and action
  - Environment/background
  - Lighting description
  - Key visual elements

### 3. Keyframe Generation
For the 2-3 most critical shots:
- Generate reference images using `higgsfield_generate_image`
- These anchor the visual consistency across the video
- Save to `{project_dir}/storyboard/keyframes/`

### 4. Shot List Output
Write structured shot list to `{project_dir}/storyboard/shots.json`:

```json
{
  "style": "cinematic",
  "totalDuration": 20,
  "shots": [
    {
      "id": 1,
      "duration": 3,
      "description": "Close-up of product emerging from shadow",
      "cameraMovement": "slow push in",
      "lighting": "dramatic side light, warm tones",
      "subject": "product centered, slight angle",
      "environment": "dark gradient background",
      "style": "cinematic, moody"
    }
  ]
}
```

Save moodboard to `{project_dir}/storyboard/moodboard.png`.

## Model Selection Guide
- **Nano Banana Pro** (`nano_banana_2`): Best for product photography, clean studio shots
- **GPT Image 2** (`gpt_image_2`): Best for conceptual/artistic moodboards
- **Seedream 4.5** (`seedream_v4_5`): Good all-rounder
- Use `higgsfield_models_explore` to check current model availability

## Constraints
- Generate ONLY the number of shots needed (4-8 for short-form)
- Keep total video duration under 30 seconds for social media
- Use consistent style keywords across all shots
- If product image provided, maintain visual consistency with it
- Track credits: each image generation costs credits. Budget-aware.
```

**Step 2: Commit**

```bash
git add plugins/brandly/agents/concept-agent.md
git commit -m "feat(brandly): add concept agent prompt"
```

---

### Task 2.3: Create Script Agent prompt file

**Objective:** Define the Script subagent that generates production-ready prompts.

**Files:**
- Create: `plugins/brandly/agents/script-agent.md`

**Step 1: Write agent prompt**

```markdown
---
description: Generates video generation prompts from storyboards
mode: subagent
---

You are the Brandly Script Agent. You convert storyboards into production-ready prompts for AI video generation models.

## Input
You receive:
- Shot list from `{project_dir}/storyboard/shots.json`
- Keyframe images from `{project_dir}/storyboard/keyframes/`
- Style direction
- Target video model (or auto-select)

## Your Tasks

### 1. Model Selection
Based on style and requirements, recommend the best model:

| Model | Best For | Max Shots | Duration |
|-------|----------|-----------|----------|
| Kling 3.0 | Multi-shot narrative, dialogue | 6 shots | 15s total |
| Hailuo 2.3 | Cinematic, Director Mode camera | 1 shot | 10s |
| Seedance 2.0 | Identity consistency, audio sync | 1 shot | 10s |
| Cinema Studio Video 3.0 | Premium cinematic | 1 shot | 10s |

Use `higgsfield_models_explore` to check current availability.

### 2. Prompt Generation

For each shot, generate a complete prompt following the model's syntax:

#### Hailuo 2.3 / Director Mode Format:
```
[Subject] [Action] in [Environment], [Camera Movement], [Lighting], [Style], [Motion Intensity]
```
Example:
```
Sleek wireless headphones floating in a dark void with particle effects, [Push in] from medium to close-up, dramatic rim light with blue accent, cinematic product commercial style, smooth slow motion
```

#### Kling 3.0 Format:
```
[Subject] [Action] at [Location], [Camera], [Style]
```
For multi-shot, use `multi_prompt` array.

#### Seedance 2.0 Format:
Follow the prompt skeleton: SUBJECT, LOCATION, ACTION with timecoded SHOTs, CAMERA, STYLE 60:30:10, CONSTRAINTS.

### 3. Prompt Consistency
- Use the same style keywords across all shots
- Reference keyframe images via `medias` parameter for visual consistency
- Maintain color palette and lighting direction
- Ensure camera movements flow logically between shots

### 4. Output
Write prompts to `{project_dir}/prompts/`:

For each shot: `shot_{id}_prompt.txt`
Plus: `{project_dir}/prompts/concatenation_plan.json`

```json
{
  "model": "kling3_0",
  "totalShots": 5,
  "shotOrder": [1, 2, 3, 4, 5],
  "assemblyNotes": "Concatenate in order. Add 0.5s fade between shots.",
  "shots": [
    {
      "id": 1,
      "prompt": "...",
      "duration": 3,
      "keyframeRef": "keyframes/shot_1.png"
    }
  ]
}
```

## Prompt Quality Rules
1. Every prompt MUST specify: Subject, Action, Environment, Camera, Lighting, Style
2. No vague terms — be specific ("slow push in" not "camera moves")
3. Include negative prompt for what to avoid
4. Match prompt length to model limits
5. If using keyframes, reference them in the prompt via medias

## Constraints
- Generate prompts ONLY. Do not execute video generation.
- Stay within the shot count from the storyboard.
- Optimize for the target model's strengths.
- Track estimated credit cost per shot.
```

**Step 2: Commit**

```bash
git add plugins/brandly/agents/script-agent.md
git commit -m "feat(brandly): add script agent prompt"
```

---

### Task 2.4: Create Asset Agent prompt file

**Objective:** Define the Asset subagent that executes video generation.

**Files:**
- Create: `plugins/brandly/agents/asset-agent.md`

**Step 1: Write agent prompt**

```markdown
---
description: Executes video generation, quality scores, and assembles final cut
mode: subagent
---

You are the Brandly Asset Agent. You execute video generation from prompts and assemble the final cut.

## Input
You receive:
- Prompts from `{project_dir}/prompts/`
- Keyframes from `{project_dir}/storyboard/keyframes/`
- Concatenation plan
- Budget remaining

## Your Tasks

### 1. Pre-Flight Check
Before generating:
- Validate all prompts exist and are well-formed
- Check model availability via `higgsfield_models_explore`
- Estimate total credit cost via `higgsfield_generate_video` with `get_cost: true`
- If cost exceeds remaining budget, report and stop

### 2. Generate Shots
For each shot in the concatenation plan:

1. Read the prompt file
2. Load any keyframe references
3. Call `higgsfield_generate_video` with:
   - `model`: from concatenation plan
   - `prompt`: from prompt file
   - `medias`: keyframe references as start_image
   - `count`: 1 (or 2 for quality selection)
4. Poll `higgsfield_job_status` until complete
5. Save rendered video to `{project_dir}/renders/shot_{id}.mp4`
6. Log credit cost to project state

### 3. Quality Scoring
After each shot renders:
- Analyze visual quality (prompt adherence, coherence, artifacts)
- Score 1-10
- If score < 6: regenerate once (max 2 attempts per shot)
- Log scores to project state

### 4. Assembly
After all shots render:
- For multi-shot videos: use `higgsfield_generate_video` with prompt that includes all shots
- Or concatenate externally if model supports it
- For continuous take: single render, no assembly needed
- Save final to `{project_dir}/renders/final_cut.mp4`

### 5. Optional Enhancements
If budget allows:
- Upscale with `higgsfield_upscale_video` (2K/4K)
- Add background music if requested
- Generate thumbnail with `higgsfield_generate_image`

### 6. Update State
After completion, update `project.json`:
- Set `currentPhase` to "publish"
- Set `finalCutPath`
- Update `creditsSpent` and `costLog`
- Add quality scores to shots array

## Error Handling
- If a generation fails: retry once, then skip and report
- If model unavailable: fall back to recommended alternative
- If budget exceeded: stop generation, report what was completed
- Always save partial results (don't discard completed shots)

## Constraints
- NEVER exceed the budget. Check before each generation.
- Maximum 2 attempts per shot (generate, re-generate if bad, then move on)
- Log every credit expenditure
- Save intermediate results — never lose work
```

**Step 2: Commit**

```bash
git add plugins/brandly/agents/asset-agent.md
git commit -m "feat(brandly): add asset agent prompt"
```

---

### Task 2.5: Create Publishing Agent prompt file

**Objective:** Define the Publish subagent that optimizes for platforms.

**Files:**
- Create: `plugins/brandly/agents/publish-agent.md`

**Step 1: Write agent prompt**

```markdown
---
description: Optimizes final video for platform-specific publishing
mode: subagent
---

You are the Brandly Publishing Agent. You take the final cut and optimize it for each target platform.

## Input
You receive:
- Final cut video from `{project_dir}/renders/final_cut.mp4`
- Target platforms list
- Product info

## Your Tasks

### 1. Platform Optimization

For each target platform:

#### TikTok
- Aspect ratio: 9:16 (vertical)
- Duration: 15-30s optimal
- Reframe with `higgsfield_reframe`
- Add captions/subtitles if applicable

#### Instagram Reels
- Aspect ratio: 9:16
- Duration: 15-30s
- Reframe with `higgsfield_reframe`
- Ensure safe zones for UI overlays

#### YouTube Shorts
- Aspect ratio: 9:16
- Duration: <60s
- Reframe with `higgsfield_reframe`

#### YouTube Long-form
- Aspect ratio: 16:9
- Can be longer
- No reframe needed if already 16:9

### 2. Thumbnail Generation
For each platform:
- Generate a thumbnail using `higgsfield_generate_image`
- Use key product frame as reference
- Save to `{project_dir}/publish/thumbnail_{platform}.png`

### 3. Publishing Checklist
Generate a markdown checklist for each platform:

```markdown
## TikTok Publishing Checklist
- [ ] Video: tiktok_9x16.mp4
- [ ] Thumbnail: thumbnail_tiktok.png
- [ ] Caption: [generated caption]
- [ ] Hashtags: [relevant hashtags]
- [ ] Best posting time: [based on trend data]
- [ ] Music: [suggested trending audio if applicable]
```

### 4. Output
Save optimized files to `{project_dir}/publish/`:
- `{platform}_9x16.mp4` (or `16x9.mp4` for YouTube)
- `thumbnail_{platform}.png`
- `publishing_guide.md`

## Constraints
- Do NOT re-render video. Only reframe existing output.
- Keep edits minimal — don't change the creative, just the format.
- Track credit cost for reframing operations.
```

**Step 2: Commit**

```bash
git add plugins/brandly/agents/publish-agent.md
git commit -m "feat(brandly): add publishing agent prompt"
```

---

## Phase 3: Orchestrator Logic

### Task 3.1: Build orchestrator tool that wires agents together

**Objective:** Create `brandly_run` tool that reads project state and dispatches the right subagents.

**Files:**
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Add orchestrator tool**

```typescript
const brandlyRun = tool({
  description:
    "Run the Brandly pipeline. Reads project state and dispatches the next agent(s). Call repeatedly to advance the pipeline.",
  args: {
    project_id: z.string().uuid(),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;
    const stateFile = await Bun.file(statePath).text();
    const state = JSON.parse(stateFile);

    const projectDir = `${ctx.directory}/.brandly/${args.project_id}`;

    // Route based on current phase
    switch (state.currentPhase) {
      case "init": {
        // Launch Trends + Concept in parallel (if idea-based)
        // For image-only: skip to Concept
        const agents = [];
        if (state.inputType === "idea" || state.inputType === "idea_with_image") {
          agents.push(
            `Task: Trends Agent — Research viral trends for "${state.productName}" on ${state.targetPlatforms.join(", ")}. Read project state from ${statePath}. Write report to ${projectDir}/virality_report.md.`
          );
        }
        agents.push(
          `Task: Concept Agent — Create storyboard for "${state.productName}". Read project state from ${statePath}. ${state.inputType !== "idea" ? "Skip trends, go straight to concept." : "Wait for virality report at ${projectDir}/virality_report.md before starting."} Write shots to ${projectDir}/storyboard/shots.json and moodboard to ${projectDir}/storyboard/moodboard.png.`
        );

        // Update state
        state.currentPhase = "trends";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          `Pipeline started. Current phase: trends + concept`,
          "",
          "Launch these subagents via the task tool:",
          ...agents.map((a, i) => `${i + 1}. ${a}`),
          "",
          "After both complete, call brandly_run again to advance to script phase.",
        ].join("\n");
      }

      case "trends": {
        // Check if virality report exists
        const reportExists = await Bun.file(`${projectDir}/virality_report.md`).exists();
        if (!reportExists && state.inputType !== "image") {
          return "Trends report not ready yet. Wait for Trends Agent to complete.";
        }

        state.currentPhase = "concept";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          "Trends phase complete. Advancing to concept.",
          "",
          "Task: Concept Agent — Create storyboard for " + state.productName,
          "Read project state from " + statePath,
          "Write shots to " + projectDir + "/storyboard/shots.json",
          "Generate keyframes to " + projectDir + "/storyboard/keyframes/",
          "",
          "After storyboard is ready, call brandly_approve to get user approval before generating prompts.",
        ].join("\n");
      }

      case "concept": {
        // Check storyboard exists
        const storyboardExists = await Bun.file(`${projectDir}/storyboard/shots.json`).exists();
        if (!storyboardExists) {
          return "Storyboard not ready yet. Wait for Concept Agent to complete.";
        }

        state.currentPhase = "script";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          "Concept phase complete. Advancing to script generation.",
          "",
          "Task: Script Agent — Generate video prompts from storyboard.",
          "Read shot list from " + projectDir + "/storyboard/shots.json",
          "Read project state from " + statePath,
          "Write prompts to " + projectDir + "/prompts/",
          "",
          "After prompts are ready, call brandly_approve for user review before asset generation.",
        ].join("\n");
      }

      case "script": {
        const promptsExist = await Bun.file(`${projectDir}/prompts/concatenation_plan.json`).exists();
        if (!promptsExist) {
          return "Prompts not ready yet. Wait for Script Agent to complete.";
        }

        state.currentPhase = "asset";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          "Script phase complete. Advancing to asset generation.",
          "",
          "Task: Asset Agent — Generate video shots from prompts.",
          "Read concatenation plan from " + projectDir + "/prompts/concatenation_plan.json",
          "Read project state from " + statePath,
          "Save renders to " + projectDir + "/renders/",
          "",
          "After all shots render, call brandly_run to advance to publishing.",
        ].join("\n");
      }

      case "asset": {
        const finalExists = await Bun.file(`${projectDir}/renders/final_cut.mp4`).exists();
        if (!finalExists) {
          return "Final cut not ready yet. Wait for Asset Agent to complete.";
        }

        state.currentPhase = "publish";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          "Asset generation complete. Advancing to publishing.",
          "",
          "Task: Publishing Agent — Optimize for platforms.",
          "Read final cut from " + projectDir + "/renders/final_cut.mp4",
          "Read project state from " + statePath,
          "Save to " + projectDir + "/publish/",
          "",
          "After publishing is complete, call brandly_run one final time to finish.",
        ].join("\n");
      }

      case "publish": {
        state.currentPhase = "done";
        state.updatedAt = new Date().toISOString();
        await Bun.write(statePath, JSON.stringify(state, null, 2));

        return [
          "=== BRANDLY PIPELINE COMPLETE ===",
          "",
          `Product: ${state.productName}`,
          `Credits spent: ${state.creditsSpent}/${state.budgetCredits}`,
          `Virality score: ${state.viralityScore ?? "N/A"}/10`,
          `Final cut: ${state.finalCutPath || "see renders/"}`,
          `Publish files: ${projectDir}/publish/`,
          "",
          "All done! Check the publish/ directory for platform-ready files.",
        ].join("\n");
      }

      case "failed":
        return `Pipeline failed. Check project state at ${statePath} and fix issues before retrying.`;

      default:
        return `Unknown phase: ${state.currentPhase}`;
    }
  },
});
```

**Step 2: Register in plugin hooks**

Update the plugin to include all tools:

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
      brandly_status: brandlyStatus,
      brandly_approve: brandlyApprove,
      brandly_run: brandlyRun,
    },
  };
};
```

**Step 3: Verify full pipeline flow**

Restart opencode. Test the flow:
1. `brandly_start` with a product idea
2. `brandly_run` repeatedly to advance phases
3. `brandly_status` to check progress
4. `brandly_approve` to gate expensive operations

**Step 4: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add orchestrator tool for pipeline routing"
```

---

## Phase 4: Cost Control Engine

### Task 4.1: Add credit tracking middleware

**Objective:** Track credits spent across all MCP calls.

**Files:**
- Create: `plugins/brandly/src/cost-tracker.ts`
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Create cost tracker module**

```typescript
import type { ProjectState } from "./types";

export class CostTracker {
  private statePath: string;
  private state: ProjectState;

  constructor(statePath: string, state: ProjectState) {
    this.statePath = statePath;
    this.state = state;
  }

  canAfford(estimatedCredits: number): boolean {
    return this.state.creditsSpent + estimatedCredits <= this.state.budgetCredits;
  }

  remaining(): number {
    return this.state.budgetCredits - this.state.creditsSpent;
  }

  async log(phase: string, action: string, credits: number): Promise<void> {
    this.state.creditsSpent += credits;
    this.state.costLog.push({
      phase,
      action,
      credits,
      timestamp: new Date().toISOString(),
    });
    this.state.updatedAt = new Date().toISOString();
    await Bun.write(this.statePath, JSON.stringify(this.state, null, 2));
  }

  async checkBudgetGate(action: string, estimatedCredits: number): Promise<string | null> {
    if (!this.canAfford(estimatedCredits)) {
      const msg = `BUDGET EXCEEDED: ${action} requires ~${estimatedCredits} credits but only ${this.remaining()} remaining. Pipeline halted.`;
      this.state.currentPhase = "failed";
      this.state.updatedAt = new Date().toISOString();
      await Bun.write(this.statePath, JSON.stringify(this.state, null, 2));
      return msg;
    }
    return null;
  }
}
```

**Step 2: Integrate into Asset Agent tool execution**

The Asset Agent tool should use CostTracker before each generation call.

**Step 3: Commit**

```bash
git add plugins/brandly/src/cost-tracker.ts plugins/brandly/src/index.ts
git commit -m "feat(brandly): add cost tracking and budget gates"
```

---

## Phase 5: Prompt Templates Library

### Task 5.1: Create prompt template files

**Objective:** Build a library of tested prompt templates for different video styles.

**Files:**
- Create: `plugins/brandly/templates/cinematic.json`
- Create: `plugins/brandly/templates/ugc.json`
- Create: `plugins/brandly/templates/montage.json`

**Step 1: Create cinematic template**

```json
{
  "style": "cinematic",
  "description": "Film-grade product commercial with dramatic lighting",
  "shotCount": 5,
  "totalDuration": 20,
  "model": "kling3_0",
  "template": {
    "subject": "{product_name} {product_action}",
    "environment": "dark studio with {accent_color} accent lighting",
    "camera": "smooth tracking shot, shallow depth of field",
    "lighting": "dramatic three-point lighting, {key_color} rim light",
    "style": "cinematic product commercial, 8K, film grain, anamorphic lens flare",
    "motion": "slow motion, elegant, premium feel"
  },
  "hooks": [
    "dramatic reveal from darkness",
    "macro detail shot pulling back to full product",
    "product rotating in spotlight"
  ]
}
```

**Step 2: Create UGC template**

```json
{
  "style": "ugc",
  "description": "Authentic user-generated content style",
  "shotCount": 4,
  "totalDuration": 15,
  "model": "kling3_0",
  "template": {
    "subject": "person holding {product_name}",
    "environment": "{setting} with natural daylight",
    "camera": "handheld, slightly shaky, authentic feel",
    "lighting": "natural window light, warm tones",
    "style": "UGC, authentic, TikTok native, casual",
    "motion": "natural hand movements, real energy"
  },
  "hooks": [
    "I tried {product_name} so you don't have to",
    "POV: you finally found the perfect {product_category}",
    "unboxing first impressions"
  ]
}
```

**Step 3: Create montage template**

```json
{
  "style": "montage",
  "description": "Fast-paced feature highlight reel",
  "shotCount": 6,
  "totalDuration": 15,
  "model": "hailuo-2.3",
  "template": {
    "subject": "{product_name} {feature_highlight}",
    "environment": "minimal {brand_color} background",
    "camera": "dynamic cuts, match cuts between features",
    "lighting": "clean, modern, product photography lighting",
    "style": "modern product montage, snappy, energetic",
    "motion": "fast transitions, rhythmic editing"
  },
  "hooks": [
    "5 reasons {product_name} changes everything",
    "every feature in 15 seconds",
    "the {product_category} that does it all"
  ]
}
```

**Step 4: Register templates in plugin**

Add a `brandly_templates` tool that lists available templates:

```typescript
const brandlyTemplates = tool({
  description: "List available Brandly video style templates",
  args: {},
  execute: async () => {
    const templates = ["cinematic", "ugc", "montage"];
    return [
      "Available templates:",
      ...templates.map((t) => `  - ${t}`),
      "",
      "Use with brandly_start: style parameter.",
      "Templates define shot count, duration, camera style, and hooks.",
    ].join("\n");
  },
});
```

**Step 5: Commit**

```bash
git add plugins/brandly/templates/ plugins/brandly/src/index.ts
git commit -m "feat(brandly): add video style prompt templates"
```

---

## Phase 6: Skills Integration

### Task 6.1: Create Brandly skill file

**Objective:** Make Brandly discoverable as a skill in opencode.

**Files:**
- Create: `plugins/brandly/skill/SKILL.md`

**Step 1: Write skill file**

```markdown
---
name: brandly
description: All-in-one product marketing video pipeline. Creates viral-ready product videos from a single idea or image using parallel agent orchestration. Use when user wants to create product videos, marketing videos, commercial content, UGC-style ads, or any video that promotes a product. Triggers on "make a product video", "create marketing video", "brand video", "product ad", "commercial", "promotional video", "viral product video".
---

# Brandly — Product Marketing Video Pipeline

Brandly orchestrates specialized agents to produce high-end product marketing videos from a single idea or image.

## Quick Start

1. Run `brandly_start` with your product name and idea/image
2. Approve storyboard when prompted
3. Approve prompts when prompted
4. Get platform-ready videos

## Pipeline Phases

1. **Trends** — Market research, virality scoring, format recommendations
2. **Concept** — Moodboard, storyboard, keyframe generation
3. **Script** — Production-ready prompts for each shot
4. **Asset** — Video generation with quality scoring
5. **Publish** — Platform reframing, thumbnails, publishing checklist

## Available Commands

| Tool | Purpose |
|------|---------|
| `brandly_start` | Initialize project and launch pipeline |
| `brandly_run` | Advance pipeline to next phase |
| `brandly_status` | Check project status and costs |
| `brandly_approve` | HITL gate for storyboard/prompts |
| `brandly_templates` | List video style templates |

## Style Templates

- **cinematic** — Film-grade product commercial
- **ugc** — Authentic user-generated content
- **montage** — Fast-paced feature highlights

## Budget Control

- Set `budget_credits` on start
- All generations are cost-checked before execution
- Pipeline halts if budget exceeded
- Full cost breakdown in project status
```

**Step 2: Register skill path in opencode config**

Add to `opencode.json`:
```json
{
  "skills": {
    "paths": ["./plugins/brandly/skill"]
  }
}
```

**Step 3: Commit**

```bash
git add plugins/brandly/skill/
git commit -m "feat(brandly): add opencode skill for discoverability"
```

---

## Phase 7: Integration Testing

### Task 7.1: End-to-end smoke test

**Objective:** Verify the complete pipeline works with a real product idea.

**Step 1: Create test script**

```bash
# In opencode session:
brandly_start --product_name "AuraGlow LED Mask" --idea "LED face mask that changes colors with music" --budget_credits 200

# Advance pipeline
brandly_run --project_id <returned-id>

# Check status
brandly_status --project_id <id>

# Approve storyboard
brandly_approve --project_id <id> --phase storyboard --approved true

# Continue advancing...
brandly_run --project_id <id>

# Approve prompts
brandly_approve --project_id <id> --phase prompts --approved true

# Continue to asset generation
brandly_run --project_id <id>
```

**Step 2: Verify outputs exist**

```bash
ls .brandly/<project-id>/
# Should contain: project.json, virality_report.md, storyboard/, prompts/, renders/, publish/
```

**Step 3: Verify cost tracking**

Check `project.json` costLog for accurate credit tracking.

**Step 4: Commit**

```bash
git add -A
git commit -m "test(brandly): end-to-end smoke test passing"
```

---

## Phase 8: Parallel Execution Engine

### Task 8.1: Rewrite orchestrator for true parallel agent dispatch

**Objective:** Replace sequential agent calls with parallel batch execution where dependencies allow.

**Files:**
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Define parallel execution groups**

The pipeline has natural parallelism:

```
Group A (parallel):  Trends Agent + Concept Agent (for idea-based projects)
Group B (after A):   Script Agent
Group C (parallel):  Asset Agent (renders shots in parallel batches)
Group D (after C):   Audio Agent + Publish Agent (parallel)
```

**Step 2: Add `brandly_batch` tool**

```typescript
const brandlyBatch = tool({
  description:
    "Execute multiple Brandly subagents in parallel. Returns all results when the batch completes.",
  args: {
    project_id: z.string().uuid().describe("Project UUID"),
    tasks: z
      .array(
        z.object({
          agent: z.enum(["trends", "concept", "script", "asset", "publish", "audio"]),
          description: z.string(),
        })
      )
      .describe("Agents to run in parallel"),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;
    const projectDir = `${ctx.directory}/.brandly/${args.project_id}`;
    const stateFile = await Bun.file(statePath).text();
    const state = JSON.parse(stateFile);

    // Build task dispatch strings for each agent
    const dispatches = args.tasks.map((task) => {
      const agentPath = `plugins/brandly/agents/${task.agent}-agent.md`;
      return [
        `--- AGENT: ${task.agent.toUpperCase()} ---`,
        `Project: ${state.productName}`,
        `State: ${statePath}`,
        `Project dir: ${projectDir}`,
        `Task: ${task.description}`,
        `Agent instructions: ${agentPath}`,
        "",
      ].join("\n");
    });

    return [
      `Launching ${args.tasks.length} agents in parallel:`,
      ...args.tasks.map((t, i) => `  ${i + 1}. ${t.agent}: ${t.description}`),
      "",
      "Use the task tool to launch each agent. All agents run simultaneously.",
      "After all complete, call brandly_run to advance the pipeline.",
      "",
      ...dispatches,
    ].join("\n");
  },
});
```

**Step 3: Update orchestrator routing in `brandly_run`**

Replace the `case "init"` block with parallel dispatch:

```typescript
case "init": {
  if (state.inputType === "idea" || state.inputType === "idea_with_image") {
    state.currentPhase = "trends";
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    return [
      "Pipeline started. Launching Trends + Concept agents in parallel.",
      "",
      "Use brandly_batch with these tasks:",
      `  1. agent: "trends" — Research viral trends for "${state.productName}"`,
      `  2. agent: "concept" — Create storyboard for "${state.productName}"`,
      "",
      "Both agents will run simultaneously. Concept Agent reads virality report when Trends Agent finishes.",
      "After both complete, call brandly_run to advance to script phase.",
    ].join("\n");
  } else {
    // Image-only: skip trends, go straight to concept
    state.currentPhase = "concept";
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    return [
      "Pipeline started (image input). Skipping trends.",
      "",
      "Task: Concept Agent — Create storyboard for " + state.productName,
      "Read project state from " + statePath,
      "Write shots to " + projectDir + "/storyboard/shots.json",
      "",
      "After storyboard ready, call brandly_run to advance.",
    ].join("\n");
  }
}
```

**Step 4: Register batch tool**

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
      brandly_status: brandlyStatus,
      brandly_approve: brandlyApprove,
      brandly_run: brandlyRun,
      brandly_batch: brandlyBatch,
    },
  };
};
```

**Step 5: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add parallel batch execution for agents"
```

---

## Phase 9: Preview-First Quality System

### Task 9.1: Add preview render phase before full generation

**Objective:** Generate low-res/short previews first, get approval, then render full quality. Saves credits on bad concepts.

**Files:**
- Modify: `plugins/brandly/agents/asset-agent.md`

**Step 1: Add preview mode instructions to Asset Agent**

Update `plugins/brandly/agents/asset-agent.md` with preview phase:

```markdown
## Preview Mode (Default)

When `previewMode: true` in project state, execute a 2-stage pipeline:

### Stage 1: Preview Renders
For each shot:
1. Generate a 480p, 3-second preview clip
2. Use reduced quality settings (480p, no upscale)
3. Save to `{project_dir}/preview/shot_{id}_preview.mp4`
4. Score each preview 1-10 for:
   - Prompt adherence (does it match the description?)
   - Visual coherence (no artifacts, consistent style?)
   - Camera movement (matches storyboard?)
   - Overall impact (would this hook a viewer?)

5. After all previews: write `{project_dir}/preview/review.md` with scores and thumbnails
6. Update project state: `previewPaths`, set `currentPhase` to "preview"
7. STOP. Wait for user approval via `brandly_approve`.

### Stage 2: Full Render (after approval)
Once user calls `brandly_approve --phase preview --approved true`:
1. Re-read approved preview scores
2. Skip shots with score >= 8 (they're good enough)
3. Re-generate shots with score < 8 at full quality (1080p, proper duration)
4. Assemble final cut

### Cost Savings
- Preview: ~10 credits per shot (480p, 3s)
- Full render: ~50 credits per shot (1080p, full duration)
- With 5 shots: preview = 50 credits, full = 250 credits
- If 3/5 previews are good: only render 2 full = 100 credits saved
```

**Step 2: Update asset-agent.md prompt to include preview logic**

Add the preview section after the existing "Your Tasks" section. Keep existing content but wrap the generation section under "Stage 2: Full Render".

**Step 3: Commit**

```bash
git add plugins/brandly/agents/asset-agent.md
git commit -m "feat(brandly): add preview-first quality system to asset agent"
```

---

## Phase 10: Post-Generation Virality Validation

### Task 10.1: Add validation loop after final cut

**Objective:** Score the final video with virality predictor and auto-suggest re-edits if score is low.

**Files:**
- Modify: `plugins/brandly/src/index.ts`
- Modify: `plugins/brandly/agents/asset-agent.md`

**Step 1: Add validation case to orchestrator**

```typescript
case "asset": {
  const finalExists = await Bun.file(`${projectDir}/renders/final_cut.mp4`).exists();
  if (!finalExists) {
    return "Final cut not ready yet. Wait for Asset Agent to complete.";
  }

  // Run post-generation virality check
  state.currentPhase = "validate";
  state.updatedAt = new Date().toISOString();
  await Bun.write(statePath, JSON.stringify(state, null, 2));

  return [
    "Asset generation complete. Running post-generation virality validation.",
    "",
    "Task: Validate final cut virality potential.",
    `1. Use higgsfield_virality_predictor with video: ${projectDir}/renders/final_cut.mp4`,
    `2. Read project state from ${statePath}`,
    `3. If score >= 7: advance to publish`,
    `4. If score < 7: suggest specific re-edits and update state to "re_edit" phase`,
    `5. Update postGenViralityScore in project state`,
    "",
    "After validation, call brandly_run to advance.",
  ].join("\n");
}
```

**Step 2: Add validation agent instructions to asset-agent.md**

```markdown
## Post-Generation Validation

After assembling the final cut:

1. Run `higgsfield_virality_predictor` on the final video
2. Compare score to initial virality prediction
3. If score < 7:
   - Analyze which shots scored lowest
   - Suggest specific improvements (better hook, faster pacing, etc.)
   - Set `currentPhase` to "re_edit" with specific shot targets
   - Log the validation result
4. If score >= 7:
   - Mark validation passed
   - Advance to publish phase
```

**Step 3: Commit**

```bash
git add plugins/brandly/src/index.ts plugins/brandly/agents/asset-agent.md
git commit -m "feat(brandly): add post-generation virality validation loop"
```

---

## Phase 11: User Preference Memory

### Task 11.1: Add preference learning across projects

**Objective:** Remember user's preferred styles, models, liked/disliked hooks across projects.

**Files:**
- Modify: `plugins/brandly/src/index.ts`
- Create: `plugins/brandly/src/memory.ts`

**Step 1: Create memory module**

```typescript
import type { ProjectState } from "./types";

const MEMORY_FILE = ".brandly/user_preferences.json";

export interface UserPreferences {
  preferredStyle: string | null;
  preferredModel: string | null;
  preferredDuration: number | null;
  likedHooks: string[];
  dislikedHooks: string[];
  avgBudgetUsage: number | null;
  completedProjects: number;
}

export async function loadPreferences(directory: string): Promise<UserPreferences> {
  const path = `${directory}/${MEMORY_FILE}`;
  try {
    const data = await Bun.file(path).text();
    return JSON.parse(data);
  } catch {
    return {
      preferredStyle: null,
      preferredModel: null,
      preferredDuration: null,
      likedHooks: [],
      dislikedHooks: [],
      avgBudgetUsage: null,
      completedProjects: 0,
    };
  }
}

export async function savePreferences(directory: string, prefs: UserPreferences): Promise<void> {
  const path = `${directory}/${MEMORY_FILE}`;
  await Bun.write(path, JSON.stringify(prefs, null, 2));
}

export async function updatePreferencesFromProject(
  directory: string,
  state: ProjectState,
  approved: boolean
): Promise<void> {
  const prefs = await loadPreferences(directory);

  if (approved) {
    prefs.completedProjects++;
    if (state.style) prefs.preferredStyle = state.style;

    // Track budget usage average
    if (prefs.avgBudgetUsage) {
      prefs.avgBudgetUsage =
        (prefs.avgBudgetUsage * (prefs.completedProjects - 1) + state.creditsSpent) /
        prefs.completedProjects;
    } else {
      prefs.avgBudgetUsage = state.creditsSpent;
    }

    // Extract liked hooks from cost log (hooks that were used in successful projects)
    const hookActions = state.costLog
      .filter((l) => l.action.includes("hook"))
      .map((l) => l.action);
    for (const hook of hookActions) {
      if (!prefs.likedHooks.includes(hook)) {
        prefs.likedHooks.push(hook);
      }
    }
  }

  await savePreferences(directory, prefs);
}

export async function getPreferencesContext(directory: string): Promise<string> {
  const prefs = await loadPreferences(directory);
  if (prefs.completedProjects === 0) return "";

  const lines = ["## User Preferences (learned from past projects)"];
  if (prefs.preferredStyle) lines.push(`- Preferred style: ${prefs.preferredStyle}`);
  if (prefs.preferredModel) lines.push(`- Preferred model: ${prefs.preferredModel}`);
  if (prefs.preferredDuration) lines.push(`- Preferred duration: ${prefs.preferredDuration}s`);
  if (prefs.avgBudgetUsage) lines.push(`- Average budget usage: ${prefs.avgBudgetUsage} credits`);
  if (prefs.likedHooks.length > 0) lines.push(`- Liked hooks: ${prefs.likedHooks.join(", ")}`);
  if (prefs.dislikedHooks.length > 0)
    lines.push(`- Disliked hooks: ${prefs.dislikedHooks.join(", ")}`);

  return lines.join("\n");
}
```

**Step 2: Integrate into orchestrator**

- On `brandly_start`: load preferences and include in project state
- On completion: call `updatePreferencesFromProject`
- When dispatching agents: include `getPreferencesContext` output in agent prompts

**Step 3: Commit**

```bash
git add plugins/brandly/src/memory.ts plugins/brandly/src/index.ts
git commit -m "feat(brandly): add user preference memory across projects"
```

---

## Phase 12: Music/Audio Pipeline

### Task 12.1: Add audio generation to the pipeline

**Objective:** Auto-generate or suggest background music for videos using existing MCP tools.

**Files:**
- Create: `plugins/brandly/agents/audio-agent.md`
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Create audio agent prompt**

```markdown
---
description: Generates background music and sound effects for product videos
mode: subagent
---

You are the Brandly Audio Agent. You generate or suggest background music for product videos.

## Input
You receive:
- Final cut video path
- Video style (cinematic, UGC, montage)
- Product name and category
- Budget remaining

## Your Tasks

### 1. Music Generation
Using `magnific_audio_music_generate`:
- Generate a music track matching the video style
- Duration: match the final cut duration
- Style keywords from the video style template
- Use `instrumental: true` for background music

Example prompts by style:
- **Cinematic**: "Epic cinematic orchestral, building tension, dramatic strings, premium product commercial feel, 30 seconds"
- **UGC**: "Lo-fi hip hop, chill beat, authentic TikTok vibe, casual background, 15 seconds"
- **Montage**: "Upbeat electronic, snappy rhythm, modern product showcase, energetic but not overwhelming, 15 seconds"

### 2. Audio Mixing Notes
Generate mixing instructions:
- Volume levels (music should not overpower any voiceover)
- Fade in/out points
- Beat sync points for cuts

### 3. Alternative: Suggest Trending Audio
If budget is tight or user prefers:
- Suggest 3 trending audio tracks from each platform
- Provide search terms for finding them
- Note: actual trending audio lookup is platform-specific

### 4. Output
- Save generated audio to `{project_dir}/audio/background_music.mp3`
- Write mixing notes to `{project_dir}/audio/mix_notes.md`
- Update project state with audio track info

## Constraints
- Only generate instrumental music (no vocals)
- Match the video duration exactly
- Log credit cost
- If budget < 50 credits remaining, suggest alternatives instead of generating
```

**Step 2: Add audio case to orchestrator**

After `validate` phase succeeds, offer audio as optional parallel step:

```typescript
case "validate": {
  // Check if validation passed
  const postScore = state.postGenViralityScore;
  if (postScore && postScore >= 7) {
    state.currentPhase = "publish";
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    return [
      "Validation passed. Score: " + postScore + "/10",
      "",
      "Optional: Generate background music with Audio Agent.",
      "Or skip directly to publishing.",
      "",
      "To add audio: launch Audio Agent task.",
      "To skip: call brandly_run to advance to publish.",
    ].join("\n");
  } else if (state.currentPhase === "re_edit") {
    return "Re-edit phase. Fix the targeted shots and re-validate.";
  } else {
    state.currentPhase = "publish";
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));
    return "Advancing to publish. (No post-gen score available)";
  }
}
```

**Step 3: Commit**

```bash
git add plugins/brandly/agents/audio-agent.md plugins/brandly/src/index.ts
git commit -m "feat(brandly): add music/audio pipeline agent"
```

---

## Phase 13: Re-Edit Loop

### Task 13.1: Add per-shot re-edit capability

**Objective:** Allow users to re-generate specific shots without redoing the entire pipeline.

**Files:**
- Modify: `plugins/brandly/src/index.ts`
- Create: `plugins/brandly/agents/reedit-agent.md`

**Step 1: Add `brandly_edit` tool**

```typescript
const brandlyEdit = tool({
  description:
    "Re-edit a specific shot in a Brandly project. Regenerates just that shot with the same or modified prompt.",
  args: {
    project_id: z.string().uuid(),
    shot_id: z.number().describe("Shot number to re-edit"),
    new_prompt: z.string().optional().describe("New prompt (omit to keep original)"),
    reason: z.string().describe("Why this shot needs re-editing"),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;
    const projectDir = `${ctx.directory}/.brandly/${args.project_id}`;
    const stateFile = await Bun.file(statePath).text();
    const state = JSON.parse(stateFile);

    // Validate shot exists
    const shot = state.shots.find((s: any) => s.id === args.shot_id);
    if (!shot) {
      return `ERROR: Shot ${args.shot_id} not found. Available shots: ${state.shots.map((s: any) => s.id).join(", ")}`;
    }

    // Update state to re-edit mode
    state.currentPhase = "re_edit";
    state.reEditTarget = args.shot_id;
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    const prompt = args.new_prompt || shot.prompt || "No prompt available";

    return [
      `Re-editing shot ${args.shot_id}: ${args.reason}`,
      "",
      `Original description: ${shot.description}`,
      `Prompt: ${prompt}`,
      "",
      `Task: Re-edit Agent — Regenerate shot ${args.shot_id}.`,
      `Project dir: ${projectDir}`,
      `State: ${statePath}`,
      `Shot ID: ${args.shot_id}`,
      `New prompt: ${args.new_prompt || "keep original"}`,
      `Reason: ${args.reason}`,
      "",
      "After re-render, call brandly_run to re-validate and continue.",
    ].join("\n");
  },
});
```

**Step 2: Create reedit agent prompt**

```markdown
---
description: Re-generates a single shot with updated parameters
mode: subagent
---

You are the Brandly Re-Edit Agent. You re-generate a single shot that needs improvement.

## Input
You receive:
- Shot ID to re-edit
- Original prompt (or new prompt)
- Project state with all renders
- Reason for re-edit

## Your Tasks

1. Read the original shot details from project state
2. Read the original prompt (or use the new one)
3. Generate the shot using the same model and settings
4. Score the new render
5. If better than original: replace the render file
6. If worse: keep original, log the attempt
7. Update project state with re-edit history
8. Re-assemble final cut if shot was replaced

## Constraints
- Maximum 2 re-edit attempts per shot
- Always compare new vs old before replacing
- Log credit cost of re-edit
- Preserve all other shots
```

**Step 3: Register edit tool**

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
      brandly_status: brandlyStatus,
      brandly_approve: brandlyApprove,
      brandly_run: brandlyRun,
      brandly_batch: brandlyBatch,
      brandly_edit: brandlyEdit,
    },
  };
};
```

**Step 4: Commit**

```bash
git add plugins/brandly/src/index.ts plugins/brandly/agents/reedit-agent.md
git commit -m "feat(brandly): add per-shot re-edit loop capability"
```

---

## Phase 14: Upfront Cost Estimation

### Task 14.1: Add cost estimation step before any generation

**Objective:** Show estimated total cost before starting, so users can adjust scope/budget.

**Files:**
- Modify: `plugins/brandly/src/index.ts`
- Modify: `plugins/brandly/agents/trends-agent.md`

**Step 1: Add estimation tool**

```typescript
const brandlyEstimate = tool({
  description:
    "Estimate the credit cost for a Brandly project before starting. Analyzes scope and returns a detailed cost breakdown.",
  args: {
    product_name: z.string(),
    idea: z.string().optional(),
    platforms: z.array(z.enum(["tiktok", "instagram", "youtube"])).default(["tiktok", "instagram"]),
    style: z.enum(["cinematic", "ugc", "montage"]).optional(),
    shot_count: z.number().min(3).max(10).default(5).describe("Number of shots (3-10)"),
    include_audio: z.boolean().default(false),
    include_upscale: z.boolean().default(false),
  },
  execute: async (args, ctx) => {
    // Cost model based on MCP pricing research
    const costs = {
      // Trends phase (websearch only, minimal cost)
      trends: { concept: 0, script: 0, asset: 0, audio: 0, publish: 0 },
      // Concept phase (image generation for moodboards + keyframes)
      concept_image: 10, // per image, ~3-5 images
      // Script phase (text generation, minimal)
      script: 0,
      // Asset phase (video generation)
      video_gen_short: 40, // 3-5s clip
      video_gen_medium: 60, // 5-10s clip
      video_gen_long: 100, // 10-15s clip
      // Preview renders (480p)
      preview_gen: 10, // per shot
      // Audio
      music_gen: 30,
      // Publishing
      reframe: 5, // per platform
      thumbnail: 10, // per platform
    };

    const shotCount = args.shot_count;
    const platformCount = args.platforms.length;
    const styleMultiplier = args.style === "cinematic" ? 1.3 : args.style === "ugc" ? 0.8 : 1.0;

    const estimate = {
      concept: Math.ceil(costs.concept_image * 4 * styleMultiplier),
      script: 0,
      preview: Math.ceil(costs.preview_gen * shotCount),
      asset: Math.ceil(costs.video_gen_medium * shotCount * styleMultiplier),
      audio: args.include_audio ? costs.music_gen : 0,
      publish: Math.ceil((costs.reframe + costs.thumbnail) * platformCount),
      total: 0,
    };
    estimate.total =
      estimate.concept + estimate.script + estimate.preview + estimate.asset + estimate.audio + estimate.publish;

    // Save estimate to project state if project_id provided
    const lines = [
      `=== Cost Estimate: ${args.product_name} ===`,
      "",
      `Style: ${args.style || "auto"}`,
      `Shots: ${shotCount}`,
      `Platforms: ${args.platforms.join(", ")}`,
      "",
      "Breakdown:",
      `  Concept (moodboards + keyframes): ${estimate.concept} credits`,
      `  Script (prompts): ${estimate.script} credits`,
      `  Preview renders (480p): ${estimate.preview} credits`,
      `  Full video generation: ${estimate.asset} credits`,
      `  Audio generation: ${estimate.audio} credits`,
      `  Publishing (reframe + thumbnails): ${estimate.publish} credits`,
      "",
      `TOTAL ESTIMATED: ${estimate.total} credits`,
      "",
      "Note: Actual costs may vary based on model selection and retry attempts.",
      "Preview phase saves credits by catching bad concepts early.",
    ];

    return lines.join("\n");
  },
});
```

**Step 2: Add estimation step to `brandly_start` flow**

Update `brandly_start` to call estimation first:

```typescript
// After writing initial state, before returning orchestrator prompt:
state.currentPhase = "estimating";
state.costEstimate = estimate; // from estimation
```

**Step 3: Register estimation tool**

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
      brandly_status: brandlyStatus,
      brandly_approve: brandlyApprove,
      brandly_run: brandlyRun,
      brandly_batch: brandlyBatch,
      brandly_edit: brandlyEdit,
      brandly_estimate: brandlyEstimate,
    },
  };
};
```

**Step 4: Commit**

```bash
git add plugins/brandly/src/index.ts
git commit -m "feat(brandly): add upfront cost estimation before generation"
```

---

## Phase 15: Publishing Automation

### Task 15.1: Upgrade publishing agent with captions, hashtags, timing

**Objective:** Generate complete publishing packages with captions, hashtags, optimal posting times, and platform-specific formatting.

**Files:**
- Modify: `plugins/brandly/agents/publish-agent.md`
- Modify: `plugins/brandly/src/index.ts`

**Step 1: Rewrite publish agent prompt**

```markdown
---
description: Generates complete publishing packages with captions, hashtags, timing, and platform formatting
mode: subagent
---

You are the Brandly Publishing Agent. You create complete, ready-to-post publishing packages for each target platform.

## Input
You receive:
- Final cut video from `{project_dir}/renders/final_cut.mp4`
- Target platforms list
- Product info (name, description, category)
- Virality report with trend data
- Project state

## Your Tasks

### 1. Platform-Specific Video Optimization

#### TikTok
- Reframe to 9:16 with `higgsfield_reframe`
- Duration: 15-30s optimal (trim if needed)
- Ensure first 1-3 seconds are the strongest hook

#### Instagram Reels
- Reframe to 9:16
- Duration: 15-30s
- Add text overlay zones (avoid bottom 20% for UI)

#### YouTube Shorts
- Reframe to 9:16
- Duration: <60s
- Ensure vertical framing

#### YouTube Long-form
- Keep 16:9 or reframe as needed
- Can be longer (30-60s)

### 2. Caption Generation

For each platform, generate:
- **Hook caption** (first line, stops the scroll)
- **Body caption** (product details, benefits)
- **CTA caption** (call to action)

Caption templates by style:
- **Cinematic**: "Introducing [Product]. [One-line benefit]. [CTA]."
- **UGC**: "[Question/hook]. I tried [Product] and here's what happened. [Benefit]. [CTA]."
- **Montage**: "[Number] reasons [Product] is a game changer. [Feature]. [Feature]. [CTA]."

### 3. Hashtag Research

For each platform, generate relevant hashtags:
- 3-5 broad hashtags (high volume)
- 3-5 niche hashtags (targeted)
- 2-3 trending hashtags (if applicable)
- Platform-specific hashtags (e.g., #TikTokMadeMeBuyIt)

Format:
```
TikTok: #TikTokMadeMeBuyIt #ProductCategory #TrendingNiche
Instagram: #ReelsViral #ProductCategory #LifestyleNiche
```

### 4. Optimal Posting Times

Based on trend data and platform research:
- Suggest 3 best posting times per platform
- Include timezone (assume user's local timezone)
- Note: actual optimal times depend on audience, these are general best practices

### 5. Thumbnail Generation

For each platform:
- Generate thumbnail with `higgsfield_generate_image`
- Use best product frame as reference
- Add text overlay zone for title
- Save to `{project_dir}/publish/thumbnail_{platform}.png`

### 6. Publishing Checklist

Generate a complete checklist per platform:

```markdown
## TikTok Publishing Checklist
- [ ] Video: tiktok_9x16.mp4
- [ ] Thumbnail: thumbnail_tiktok.png
- [ ] Caption:
  Hook: [first line]
  Body: [product details]
  CTA: [call to action]
- [ ] Hashtags: [list]
- [ ] Best posting time: [time 1], [time 2], [time 3]
- [ ] Music: [suggested trending audio]
- [ ] Effects: [relevant effects if any]
- [ ] Post format: [In-feed / Spark Ad / TopView]
```

### 7. Output

Save to `{project_dir}/publish/`:
- `{platform}_9x16.mp4` (optimized video)
- `thumbnail_{platform}.png`
- `caption_{platform}.md` (caption text)
- `hashtags_{platform}.md` (hashtag list)
- `publishing_checklist_{platform}.md` (complete checklist)
- `publishing_guide.md` (master guide with all platforms)

### 8. Optional: Direct Publishing

If user has API access configured:
- Use platform APIs to schedule posts
- Set up auto-posting at optimal times
- Note: requires API credentials, not available by default

## Constraints
- Do NOT re-render video. Only reframe existing output.
- Keep captions concise (TikTok: <150 chars, Instagram: <300 chars)
- Hashtags: max 30 per post (TikTok), 30 (Instagram), 15 (YouTube)
- Always include the product name in captions
- Track credit cost for all operations
```

**Step 2: Add `brandly_publish` tool for direct publishing actions**

```typescript
const brandlyPublish = tool({
  description:
    "Execute the publishing phase: reframe videos, generate thumbnails, captions, hashtags, and posting schedules.",
  args: {
    project_id: z.string().uuid(),
    platforms: z
      .array(z.enum(["tiktok", "instagram", "youtube"]))
      .optional()
      .describe("Override target platforms"),
  },
  execute: async (args, ctx) => {
    const statePath = `${ctx.directory}/.brandly/${args.project_id}/project.json`;
    const projectDir = `${ctx.directory}/.brandly/${args.project_id}`;
    const stateFile = await Bun.file(statePath).text();
    const state = JSON.parse(stateFile);

    const platforms = args.platforms || state.targetPlatforms;

    state.currentPhase = "publish";
    state.updatedAt = new Date().toISOString();
    await Bun.write(statePath, JSON.stringify(state, null, 2));

    return [
      `Launching Publishing Agent for ${platforms.join(", ")}.`,
      "",
      `Task: Publishing Agent — Create complete publishing packages.`,
      `Project dir: ${projectDir}`,
      `State: ${statePath}`,
      `Platforms: ${platforms.join(", ")}`,
      `Final cut: ${projectDir}/renders/final_cut.mp4`,
      "",
      "For each platform, generate:",
      "  1. Reframed video (9:16 for Shorts/Reels/TikTok)",
      "  2. Thumbnail image",
      "  3. Captions (hook + body + CTA)",
      "  4. Hashtags (broad + niche + trending)",
      "  5. Optimal posting times",
      "  6. Complete publishing checklist",
      "",
      "After completion, all files will be in the publish/ directory.",
    ].join("\n");
  },
});
```

**Step 3: Register publish tool**

```typescript
const BrandlyPlugin: Plugin = async ({ client, project, directory, $ }) => {
  return {
    tool: {
      brandly_start: brandlyStart,
      brandly_status: brandlyStatus,
      brandly_approve: brandlyApprove,
      brandly_run: brandlyRun,
      brandly_batch: brandlyBatch,
      brandly_edit: brandlyEdit,
      brandly_estimate: brandlyEstimate,
      brandly_publish: brandlyPublish,
    },
  };
};
```

**Step 4: Commit**

```bash
git add plugins/brandly/src/index.ts plugins/brandly/agents/publish-agent.md
git commit -m "feat(brandly): add complete publishing automation with captions/hashtags/timing"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 0 | 2 | Scaffold, types, plugin registration |
| 1 | 3 | Core tools (start, status, approve) |
| 2 | 5 | Agent prompt definitions |
| 3 | 1 | Orchestrator routing logic |
| 4 | 1 | Cost control engine |
| 5 | 1 | Prompt template library |
| 6 | 1 | Skill integration |
| 7 | 1 | E2E testing |
| 8 | 1 | Parallel batch execution |
| 9 | 1 | Preview-first quality system |
| 10 | 1 | Post-gen virality validation |
| 11 | 1 | User preference memory |
| 12 | 1 | Music/audio pipeline |
| 13 | 1 | Per-shot re-edit loop |
| 14 | 1 | Upfront cost estimation |
| 15 | 1 | Publishing automation (captions/hashtags/timing) |
| **Total** | **23** | |

## Dependencies

- `@opencode-ai/plugin` SDK (already installed)
- Higgsfield MCP (already configured)
- Magnific MCP (already configured)
- No new npm packages needed

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| MCP connection failures | Retry logic in Asset Agent, graceful degradation |
| Cost overrun | Hard budget gates in CostTracker + upfront estimation |
| Model unavailability | Fallback model chain in Script Agent |
| Inconsistent shots | Keyframe references + style keyword consistency |
| Token burn | Preview-first pipeline + phased execution with HITL gates |
| Bad final output | Post-gen virality validation loop with auto-re-edit |
| Wasted credits on re-renders | Per-shot re-edit instead of full pipeline restart |
| User preference drift | Memory system learns across projects |
