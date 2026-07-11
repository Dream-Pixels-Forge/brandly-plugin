# How It Works

## Step 0: Select Provider (NEW)
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

## Step 1: Analyze an Image (optional but recommended)
Before starting a project, deep-analyze any product image. This feeds every downstream agent with forensic-level detail:
```bash
brandly_analyze_image(
  imagePath="https://example.com/product.jpg",
  context="Premium wireless earbuds targeting Gen Z"
)
```
Returns structured JSON with: subject, product details, colors (hex), lighting, composition, style, emotion, platform suitability, and creative direction. You can also attach it to a project:
```bash
brandly_analyze_image(imagePath="...", projectID="<uuid>")
```

## Step 1: Start a Project
```bash
brandly_start(
  idea="Organic matcha latte powder that froths instantly",
  productName="MatchaQuick",
  targetPlatforms=["tiktok", "instagram"],
  budgetCredits=300
)
```
Returns a project ID. Save it.

## Step 2: Run the Pipeline
```bash
brandly_run_project(projectID="<uuid>")
```
Returns JSON with dispatch instructions. Use the `task` tool to dispatch the subagent:
```bash
task(
  description="Brandly concept agent",
  prompt=<dispatch.prompt from the JSON response>,
  subagent_type="general"
)
```
The subagent has access to Higgsfield and Magnific MCP tools for asset generation.

## Step 3: Approve & Advance
After the subagent completes, approve the phase:
```bash
brandly_approve(projectID="<uuid>", phase="trends")
```
Then call brandly_run_project again for the next phase.

## Step 4: Check Status
```bash
brandly_status(projectID="<uuid>")
```
Shows current phase, budget spent, virality score, and artifacts.

## Step 5: Validate
After the final video is rendered:
```bash
brandly_validate(projectID="<uuid>", videoPath="<path to video>")
```
Returns MCP call instructions. Call `higgsfield_virality_predictor` via MCP with the provided params.

## Step 6: Publish
After validation passes (score >= 7):
```bash
brandly_run_project(projectID="<uuid>")  // dispatches publish_agent
```

# Pipeline Phases
0. **image_analysis** — Deep-analyzes input image (subject, colors, lighting, style, creative direction)
1. **trends** — Researches current viral formats for the product
2. **concept** — Generates 3 video concepts, recommends the best
3. **script** — Breaks the concept into shots with AI prompts
4. **asset** — Plans and generates video/image assets
5. **audio** — Plans music, voiceover, and sound effects
6. **validate** — Scores final video for virality (Higgsfield virality predictor)
7. **publish** — Generates platform-specific captions and hashtags
