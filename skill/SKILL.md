---
name: brandly
description: Generate viral-ready product marketing videos from a single idea or image. Orchestrates trend research, concept development, AI video generation, quality scoring, and multi-platform publishing — all with strict cost control.
---

# Brandly — AI Product Video Generator

## What This Plugin Does
Brandly turns a product idea + optional image into a complete, platform-ready marketing video. It orchestrates specialized AI agents through a pipeline: trend research → concept → script → asset generation → quality validation → publishing.

## When To Use
Trigger on: "make a product video", "create a marketing video for [product]", "generate a TikTok ad", "make a viral product clip", "Brandly this product", "turn my product into a video"

## How It Works

### Step 0: Analyze an Image (optional but recommended)
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
