---
name: brandly
description: Generate viral-ready product marketing videos from a single idea or image. Orchestrates trend research, concept development, AI video generation, quality scoring, and multi-platform publishing — all with strict cost control.
---

# Brandly — AI Product Video Generator

## What This Plugin Does
Brandly turns a product idea + optional image into a complete, platform-ready marketing video. It orchestrates specialized AI agents through a pipeline: trend research → concept → script → asset generation → quality validation → publishing.

## The Director's Vision

Every product video follows cinematic principles:

### The STAMP Framework
Evaluate every video against these principles:
- **S**hot Intentionality — Does each shot have a reason to exist beyond looking good?
- **T**emporal Logic — Does one moment cause or lead to the next?
- **A**uthorial Vision — Is there a direction across time, not just a style?
- **M**ontage Intelligence — Does the edit create meaning, not just connect images?
- **P**remise — Can you state your film's reason in one sentence?

### The Three-Act Structure
Every video follows a story arc:
- **Act 1 (0-3 seconds)**: The Hook — Grab them by the throat
- **Act 2 (3-12 seconds)**: The Journey — Build desire, show the transformation
- **Act 3 (12-15+ seconds)**: The Payoff — Deliver the emotional resolution

### The 8-Layer Prompt Framework
Every production-grade prompt must address:
1. **SUBJECT** — Who/what is the focus?
2. **EMOTION** — What feeling should it evoke?
3. **OPTICS** — Lens, depth of field, FOV
4. **MOTION** — How does subject/camera move?
5. **LIGHTING** — Atmosphere, mood, direction
6. **STYLE** — Genre, era, aesthetic
7. **AUDIO** — Dialogue, SFX, music
8. **CONTINUITY** — What connects this to other shots?

## When To Use
Trigger on: "make a product video", "create a marketing video for [product]", "generate a TikTok ad", "make a viral product clip", "Brandly this product", "turn my product into a video"

## Virality Predictor Integration

Brandly uses the **Higgsfield Virality Predictor** (`brain_activity`) to score finished videos for virality potential. This is the industry standard for video creative testing.

### What It Measures
- **Hook Strength** — How effectively the video captures attention
- **Sustain** — How long attention is maintained
- **Brain Region Scores** — Visual, Auditory, Language, Attention, Default Mode
- **Overall Virality Score** — Composite score (0-100)

### Scoring Thresholds
| Score | Rating | Action |
|-------|--------|--------|
| 80-100 | Excellent | Ready for publishing |
| 60-79 | Good | Minor improvements recommended |
| 40-59 | Average | Significant re-edit needed |
| 0-39 | Poor | Major rework required |

### Platform-Specific Requirements
| Platform | Minimum Score | Hook Requirement |
|----------|---------------|------------------|
| TikTok | 60+ | Hook in first 1-2 seconds |
| Instagram | 55+ | Hook in first 2-3 seconds |
| YouTube | 50+ | Hook in first 3-5 seconds |
| Twitter/X | 65+ | Hook in first 1-2 seconds |

### Command
```bash
higgsfield generate create brain_activity --video ./finished-video.mp4 --wait
```

### Example Output
```
Overall score: 72/100
Peak hook: 65% at 2s
Sustain: 84%
Strongest region: Visual Cortex (78)
Risk: Default Mode is moderate (32)
Open report: https://app.higgsfield.ai/apps/virality-predictor?resultJobId=...
```

## How It Works

### Step 0: Select Provider (NEW)
Choose your preferred AI generation platform:

```bash
brandly_select_provider(projectID="<uuid>", providerId="higgsfield")
```

**Available Providers:**
- **Higgsfield AI** — Comprehensive platform (image, video, 3D, audio, marketing)
- **Kling AI (可灵)** — Strong motion and physics, budget-friendly
- **OpenArt** — Community models, experimental aesthetics
- **Magnific AI** — Image upscaling and enhancement
- **Runway ML** — Professional cinematic quality
- **Pika Labs** — Creative stylized effects

**List Providers:**
```bash
brandly_select_provider(listOnly=true)
```

### Step 1: Analyze an Image (optional but recommended)
Before starting a project, deep-analyze any product image. This feeds every downstream agent with forensic-level detail:
```
brandly_analyze_image(
  imagePath="https://example.com/product.jpg",
  context="Premium wireless earbuds targeting Gen Z"
)
```
Returns structured JSON with: subject, product details, colors (hex), lighting, composition, style, emotion, platform suitability, and creative direction. You can also attach it to a project:
```
brandly_analyze_image(imagePath="...", projectID="<uuid>")
```

### Step 1: Start a Project
```
brandly_start(
  idea="Organic matcha latte powder that froths instantly",
  productName="MatchaQuick",
  targetPlatforms=["tiktok", "instagram"],
  budgetCredits=300
)
```
Returns a project ID. Save it.

### Step 2: Run the Pipeline
```
brandly_run_project(projectID="<uuid>")
```
Returns JSON with dispatch instructions. Use the `task` tool to dispatch the subagent:
```
task(
  description="Brandly concept agent",
  prompt=<dispatch.prompt from the JSON response>,
  subagent_type="general"
)
```
The subagent has access to Higgsfield and Magnific MCP tools for asset generation.

### Step 3: Approve & Advance
After the subagent completes, approve the phase:
```
brandly_approve(projectID="<uuid>", phase="trends")
```
Then call brandly_run_project again for the next phase.

### Step 4: Check Status
```
brandly_status(projectID="<uuid>")
```
Shows current phase, budget spent, virality score, and artifacts.

### Step 5: Validate
After the final video is rendered:
```
brandly_validate(projectID="<uuid>", videoPath="<path to video>")
```
Returns MCP call instructions. Call `higgsfield_virality_predictor` via MCP with the provided params.

### Step 6: Publish
After validation passes (score >= 7):
```
brandly_run_project(projectID="<uuid>")  // dispatches publish_agent
```

## Pipeline Phases
0. **image_analysis** — Deep-analyzes input image (subject, colors, lighting, style, creative direction)
1. **trends** — Researches current viral formats for the product
2. **concept** — Generates 3 video concepts, recommends the best
3. **script** — Breaks the concept into shots with AI prompts
4. **asset** — Plans and generates video/image assets
5. **audio** — Plans music, voiceover, and sound effects
6. **validate** — Scores final video for virality (Higgsfield virality predictor)
7. **publish** — Generates platform-specific captions and hashtags

## Folder Structure — Project Artifacts & Generated Files

Brandly uses four top-level folders. Three hold generated binary files; one holds project info:

```
.brandly/                          — project info (state, plans, scripts, memory)
  projects/
    {project-id}/
      project.json                 # Full project state (phase, budget, shots, etc.)
      history.log                  # Timestamped action log
      analysis/
        image-analysis.md          # Image analyzer output (12 dimensions)
        trends.md                  # Trending formats, recommended style, platform notes
      script/
        concept.md                 # 3 video concepts with hooks, narrative arcs
        script.md                  # Full shot-by-shot script with prompts
      storyboard/
        storyboard.md              # Visual storyboard with timeline table
      assets/
        asset-plan.json            # Model selection, credits, generation plan
      audio/
        audio-plan.md              # Music and voiceover decisions
  memory.json                      # Global user preferences (hooks, styles)

imagen/                            — generated images (asset phase outputs)
  {project-id}/
    shot-1.png
    shot-2.png
    hero.png

videgen/                           — generated videos (rendered clips, final cuts)
  {project-id}/
    shot-1.mp4
    shot-2.mp4
    final-cut.mp4

audgen/                            — generated audio (music, voiceover, SFX)
  {project-id}/
    background.mp3
    voiceover.mp3
```

### What Gets Saved Where
| Phase | Folder | File | Contents |
|-------|--------|------|----------|
| image_analysis | `.brandly` | `analysis/image-analysis.md` | Subject, colors, lighting, style, creative direction |
| trends | `.brandly` | `analysis/trends.md` | Trending formats, recommended style, platform notes |
| concept | `.brandly` | `script/concept.md` | 3 concepts with hooks, narrative, CTA, credit estimates |
| script | `.brandly` | `script/script.md` | Full shot list with prompts, camera, lighting |
| script | `.brandly` | `storyboard/storyboard.md` | Timeline table + individual shot details |
| asset | `.brandly` | `assets/asset-plan.json` | Model selection, credit costs, generation queue |
| asset | `imagen` | `shot-*.png` | Generated images from Higgsfield/Magnific |
| audio | `.brandly` | `audio/audio-plan.md` | Music choices, voiceover script, SFX plan |
| audio | `audgen` | `*.mp3` | Generated music and voiceover files |
| validate | `videgen` | `final-cut.mp4` | Final rendered video for virality scoring |

### Reusing Artifacts
All `.brandly/` artifacts are human-readable markdown — browse, copy, and remix freely.
Generated files in `imagen/`, `videgen/`, and `audgen/` are organized per-project for easy location.

## Cost Control
- Every project has a credit budget (default 500)
- The pipeline checks budget before each expensive operation
- If budget runs out, the pipeline pauses and reports what's been spent
- Check with brandly_status to see remaining budget

## Download & Export

### Download Generated Media
After asset/audio phases, download generated files locally:
```
brandly_download(
  projectID="<uuid>",
  mediaType="video",
  mediaUrl="https://higgsfield.ai/...",
  filename="shot-1.mp4",
  jobId="<optional-job-id>"
)
```

**Media Types:**
- `image` → saves to `imagen/{project-id}/`
- `video` → saves to `videgen/{project-id}/`
- `audio` → saves to `audgen/{project-id}/`

### Export Project
Export all artifacts and media files:
```
brandly_export(
  projectID="<uuid>",
  outputPath="./my-project-export/"  // optional
)
```

**Export Includes:**
- All phase artifacts (markdown, JSON)
- All downloaded media (images, videos, audio)
- Export manifest with file inventory

**Default Export Location:** `.brandly/projects/{id}/export/`

## Video Editing with Remotion

Brandly includes **Remotion** for programmatic video editing. Create compositions, trim, concat, overlay, add transitions, text, audio, and effects.

### Video Edit Operations

#### Trim Video
```
brandly_video_edit(
  projectID="<uuid>",
  operation="trim",
  inputFiles=["shot-1.mp4"],
  params={
    "startTime": 2,
    "duration": 5,
    "width": 1920,
    "height": 1080
  }
)
```

#### Concatenate Videos
```
brandly_video_edit(
  projectID="<uuid>",
  operation="concat",
  inputFiles=["shot-1.mp4", "shot-2.mp4", "shot-3.mp4"],
  params={
    "transitionDuration": 1,
    "width": 1920,
    "height": 1080
  }
)
```

#### Overlay Image/Video
```
brandly_video_edit(
  projectID="<uuid>",
  operation="overlay",
  inputFiles=["main-video.mp4", "logo.png"],
  params={
    "position": "top-right",
    "scale": 0.2,
    "width": 1920,
    "height": 1080
  }
)
```

#### Add Transitions
```
brandly_video_edit(
  projectID="<uuid>",
  operation="transition",
  inputFiles=["clip-1.mp4", "clip-2.mp4"],
  params={
    "transitionType": "fade",
    "transitionDuration": 1,
    "width": 1920,
    "height": 1080
  }
)
```

#### Add Text Overlay
```
brandly_video_edit(
  projectID="<uuid>",
  operation="add-text",
  inputFiles=["video.mp4"],
  params={
    "text": "Brand Name",
    "fontSize": 72,
    "color": "#ffffff",
    "position": "center",
    "width": 1920,
    "height": 1080
  }
)
```

#### Add Audio
```
brandly_video_edit(
  projectID="<uuid>",
  operation="add-audio",
  inputFiles=["video.mp4"],
  params={
    "audioFile": "background-music.mp3",
    "volume": 0.8,
    "width": 1920,
    "height": 1080
  }
)
```

#### Add Effects
```
brandly_video_edit(
  projectID="<uuid>",
  operation="add-effect",
  inputFiles=["video.mp4"],
  params={
    "effectType": "blur",
    "intensity": 5,
    "width": 1920,
    "height": 1080
  }
)
```

#### Resize Video
```
brandly_video_edit(
  projectID="<uuid>",
  operation="resize",
  inputFiles=["video.mp4"],
  params={
    "newWidth": 1280,
    "newHeight": 720,
    "width": 1920,
    "height": 1080
  }
)
```

#### Crop Video
```
brandly_video_edit(
  projectID="<uuid>",
  operation="crop",
  inputFiles=["video.mp4"],
  params={
    "x": 100,
    "y": 50,
    "width": 1280,
    "height": 720
  }
)
```

### Render Video
After creating a composition, render it to produce the final video:

```
brandly_render_video(
  projectID="<uuid>",
  compositionPath="./video-edits/<project-id>/composition-<timestamp>.tsx",
  outputPath="./renders/<project-id>/final-video.mp4",
  format="mp4",
  quality="high"
)
```

**Quality Presets:**
- `low` — Fast rendering, smaller file size
- `medium` — Balanced quality and speed
- `high` — Good quality, recommended for most uses
- `ultra` — Maximum quality, slower rendering

**Output Formats:**
- `mp4` — H.264, most compatible
- `webm` — VP8, web-optimized
- `gif` — Animated GIF

### Video Editing Workflow

1. **Generate assets** — Use Higgsfield/Kling to generate images and videos
2. **Download assets** — Use `brandly_download` to save locally
3. **Edit videos** — Use `brandly_video_edit` to create compositions
4. **Render** — Use `brandly_render_video` to produce final video
5. **Validate** — Use `brandly_validate` with Virality Predictor
6. **Export** — Use `brandly_export` to package everything

## Motion Graphics — Remotion Animations

Create animated motion graphics with frame-accurate timing, spring physics, and easing curves. Generates a complete Remotion project ready for preview and render.

### Quick Start (Preset)
```
brandly_motion_graphics(
  projectID="<uuid>",
  preset="title-reveal"
)
```

### Custom Scene
```
brandly_motion_graphics(
  projectID="<uuid>",
  preset="custom",
  scenes=[{
    id: "intro",
    duration: 3,
    background: "#0a0a0a",
    elements: [{
      type: "text",
      x: 10, y: 40,
      width: 80,
      text: "HELLO WORLD",
      color: "#ffffff",
      fontSize: 72,
      fontWeight: "bold",
      fontFamily: "Arial, sans-serif",
      animation: {
        type: "fadeIn",
        duration: 0.8,
        easing: "spring"
      }
    }]
  }]
)
```

### Presets

| Preset | Duration | Description |
|--------|----------|-------------|
| `title-reveal` | 4s | Typewriter title + subtitle with gradient background, animated line divider |
| `product-showcase` | 10s | Intro circle + feature cards sliding in + CTA button |
| `kinetic-text` | 6.5s | 4-word sequence: scale, slide, bounce — big impact typography |
| `stats-counter` | 5s | 3 animated counters (countUp) with labels + divider line |
| `custom` | variable | Full control: provide your own scenes and elements |

### Animation Types

| Animation | Effect |
|-----------|--------|
| `fadeIn` | Opacity 0→1 |
| `fadeOut` | Opacity 1→0 |
| `slideInLeft` | Slide from -100% left |
| `slideInRight` | Slide from +110% right |
| `slideInTop` | Slide from -100% top |
| `slideInBottom` | Slide from +110% bottom |
| `scaleIn` | Scale 0→1 |
| `scaleOut` | Scale 1→0 |
| `rotateIn` | Rotate -180°→0° |
| `typewriter` | Character-by-character reveal |
| `bounce` | Elastic overshoot (3 bounces) |
| `pulse` | Continuous scale oscillation |
| `blurIn` | Blur 20px→0px |
| `countUp` | Number 0→target value |
| `drawLine` | Line 0%→100% width (scaleX) |

### Easing Modes

| Easing | Curve |
|--------|-------|
| `linear` | `[0, 0, 1, 1]` — constant speed |
| `easeIn` | `[0.4, 0, 1, 1]` — slow start |
| `easeOut` | `[0, 0, 0.2, 1]` — slow end |
| `easeInOut` | `[0.4, 0, 0.2, 1]` — slow start + end |
| `spring` | `spring({ damping: 10, stiffness: 100 })` — spring physics |

### Element Types

| Type | Properties |
|------|------------|
| `text` | `text`, `color`, `fontSize`, `fontWeight`, `fontFamily` |
| `rect` | `color`, `borderRadius`, `opacity` |
| `circle` | `color`, `width`, `height` (rendered as border-radius: 50%) |
| `line` | `color`, `strokeWidth`, `width` (percentage) |
| `image` | `src` (URL), `width`, `height` |

### Positioning

All elements use **percentage-based** positioning relative to the canvas:
- `x`: horizontal position (0 = left, 100 = right)
- `y`: vertical position (0 = top, 100 = bottom)
- `width`: element width as percentage of canvas
- `height`: element height as percentage of canvas

### Output

The tool generates a complete Remotion project in `motion-graphics/{project-id}/`:
```
motion-graphics/{project-id}/
  src/
    Composition.tsx    # Full animation code with interpolate/spring
    index.ts           # Remotion root
  remotion.config.ts  # Remotion config
  package.json        # Dependencies
  build.sh            # Build script
  motion-graphics-meta.json  # Project metadata
```

**Preview:** `npm start` (opens Remotion Studio)
**Render:** `npm run build` (outputs MP4)
**Render GIF:** `npm run build:gif`
**Render WebM:** `npm run build:webm`

### Custom Scene Structure

Each scene object:
```json
{
  "id": "scene-name",
  "duration": 3,
  "background": "#000000",
  "backgroundImage": "https://...",
  "elements": [
    {
      "type": "text",
      "x": 10,
      "y": 40,
      "width": 80,
      "text": "YOUR TEXT",
      "color": "#ffffff",
      "fontSize": 72,
      "fontWeight": "bold",
      "fontFamily": "Arial, sans-serif",
      "animation": {
        "type": "fadeIn",
        "duration": 0.8,
        "delay": 0.3,
        "easing": "spring"
      }
    }
  ]
}
```

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `projectID` | yes | — | Project UUID |
| `preset` | yes | — | `title-reveal`, `product-showcase`, `kinetic-text`, `stats-counter`, `custom` |
| `scenes` | no* | — | Custom scenes array (*required when `preset="custom"`) |
| `fps` | no | 30 | Frames per second |
| `width` | no | 1920 | Output width in pixels |
| `height` | no | 1080 | Output height in pixels |
| `outputPath` | no | auto | Custom output file path |
| `autoRender` | no | false | Auto-render after creation |

## Tips
- **Run image analysis first** — even before starting a project. The analysis gives you a creative brief you can refine before committing credits.
- Start with a clear product idea — the more specific, the better the concepts
- Include a product image for better visual consistency
- Use preview mode (default) to generate low-res previews before full renders
- After validation, you can re-edit individual shots if the score is low
- The plugin remembers your preferences across projects
- The image analyzer works on any image — competitor products, mood boards, lifestyle shots, packaging mockups

## Re-editing Shots
If validation score is low, re-edit specific shots:
```
brandly_re_edit(projectID="<uuid>", shotId="shot-1", newPrompt="more dramatic lighting, faster cuts")
```
Then re-run the asset phase to regenerate.

## Cost Estimation
Before starting, estimate costs:
```
brandly_estimate(idea="...", productName="...", style="cinematic", shotCount=5)
```

## Memory
View or update your preferences:
```
brandly_memory(action="view")
brandly_memory(action="like_hook", hook="product reveal zoom")
brandly_memory(action="dislike_hook", hook="slow pan")
```

---

## Image Generation — Model Costs & Selection

### Credit Costs (Images)

| Model | Credits | Speed | Quality | Best For |
|---|---|---|---|---|
| **Z Image** | ~0.25 | 1-3s | Draft | Fast iteration, concept exploration |
| **Nano Banana** | ~1 | 4-6s | B | Budget-friendly realistic output |
| **Nano Banana 2** | ~2 | 4-6s | A | Character, product, everyday default |
| **Seedream 5.0 Lite** | ~2 | Fast | A | Instruction edits, visual reasoning |
| **Soul Location** | ~2 | Moderate | A | Environments, no-people scenes |
| **Flux 2.0** | ~2-3 | Moderate | A | Creative, strong prompt adherence |
| **Soul 2.0** | ~2-3 | Moderate | S | Fashion, UGC, editorial, lifestyle |
| **Soul Cinema** | ~3 | Moderate | S | Cinematic stills, film-grade lighting |
| **Nano Banana Pro** | ~2 | 10-20s | S | Top fidelity, text, hard briefs |
| **GPT Image 2** | ~3-5 | Moderate | S | High-fidelity, typography, complex |
| **Seedream 4.5** | ~3 | Moderate | A | Face edits, scene swaps |
| **Recraft V4.1** | ~2 | Fast | A | Logos, icons, vector graphics |

### Video Costs (per second, approximate)

| Model | Credits/sec | Max Duration | Notes |
|---|---|---|---|
| Kling 3.0 Turbo | ~2-3 | 5-10s | Cheapest for simple motion |
| Kling 3.0 | ~3-5 | 15s | Best value for product showcases |
| Minimax Hailuo | ~3-5 | 5-10s | Cheap, strong physics |
| Seedance 1.5 Pro | ~4-6 | 10s | Budget clean single-take |
| Seedance 2.0 | ~5-8 | 15s | SOTA quality, identity lock |
| Veo 3.1 Lite | ~5-8 | 8s | Fast batch work |

### Free Tier
- 10 daily credits, watermarked, 720p max
- ~4 Z Image drafts OR ~5 Nano Banana 2 outputs per day
- No commercial license

### Unlimited Passes (Plus plan and up)
- Kling 3.0, Flux 2.0 Pro, Seedream 5.0 Lite, Nano Banana 2, Soul 2.0, Soul Cinema
- Nano Banana Pro unlimited only at Ultra tier ($99/mo annual)

### Budget Selection Logic

```
previewMode → Z Image (0.25 cr) + Kling 3.0 Turbo

budget < 50 → Nano Banana 2 (2 cr) + Kling 3.0
budget 50-150 → Soul 2.0 hero + Nano Banana 2 supporting + Seedance 2.0
budget > 150 → GPT Image 2 / Nano Banana Pro + Seedance 2.0
```

---

## Prompt Optimization — 2500 Char Limit

### Realism Formula
Every image prompt MUST follow:
```
[PHOTOGRAPHY STYLE] of [SUBJECT] [ACTION], [ENVIRONMENT], [LIGHTING], [CAMERA], [STYLE], [MOOD], [QUALITY]
```

### Quick Reference Keywords

**Style:** Studio product photography / Editorial lifestyle / Street photography / Flat lay / Fashion editorial
**Lighting:** Golden hour side light / Soft diffused studio / Dramatic chiaroscuro / Backlit with fill
**Camera:** Shallow DOF f/1.8 bokeh / Wide angle low / Macro close-up / Eye-level medium shot
**Quality:** Photorealistic 8K / Shot on Canon EOS R5 85mm f/1.4 / Commercial advertising / Film grain Kodak Portra
**Mood:** Warm and inviting / Sleek and modern / Luxurious premium / Energetic bold

### Prompt Length Targets
- **Budget models** (Z Image, Nano Banana): Under 800 chars
- **Production models** (Nano Banana 2, Soul, GPT Image 2): 250-400 chars ideal, max 2500

### Do's and Don'ts
- **DO**: Start with subject, specify camera/lens, mention lighting direction, reference textures
- **DON'T**: Waste chars on "beautiful"/"stunning", list >3 style keywords, repeat concepts

Full prompt templates and examples: `references/higgsfield-models.md`
