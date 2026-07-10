# Brandly Plugin
<img width="1983" height="793" alt="banner" src="https://github.com/user-attachments/assets/246d040d-8029-445f-b3c9-f4b68c6c78ce" />

AI product video orchestrator for OpenCode. Turns product ideas into platform-ready marketing videos using a multi-agent pipeline.

## Install

### 1. Add to your project

Create or edit `.opencode/package.json` in your project root:

```json
{
  "dependencies": {
    "brandly": "github:Dream-Pixels-Forge/brandly-plugin"
  }
}
```

### 2. Register the plugin

Create or edit `opencode.json` in your project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["brandly"]
}
```

### 3. Start OpenCode

That's it. OpenCode auto-installs dependencies via `bun install` on startup and loads the plugin. The `brandly_*` tools will be available.

## Tools

| Tool | Description |
|---|---|
| `brandly_start` | Start a new video project with a product idea and optional image |
| `brandly_analyze_image` | Deep-analyze any image (12 dimensions) before starting a project |
| `brandly_run_project` | Run the next pipeline phase (dispatches the appropriate agent) |
| `brandly_approve` | Approve the current phase and advance to the next |
| `brandly_status` | Check project status — phase, budget, virality score |
| `brandly_estimate` | Estimate credit cost before starting |
| `brandly_re_edit` | Re-edit a specific shot with a new prompt |
| `brandly_validate` | Run Higgsfield virality predictor on the final video |
| `brandly_record_cost` | Record actual credit spend against budget |
| `brandly_save_artifact` | Save a subagent's output to the project folder |
| `brandly_list_projects` | List all Brandly projects |
| `brandly_memory` | View/update user preferences (liked hooks, preferred style) |

## Pipeline

```
init → trends → concept → script → asset → audio → validate → publish → done
```

## Folder Structure

When you start a project, Brandly creates these in your workspace:

```
.brandly/projects/{id}/     Project state, artifacts, history
  ├── analysis/             Image analysis, trends research
  ├── script/               Concept doc, shot-by-shot script
  ├── storyboard/           Visual storyboard
  ├── assets/               Asset generation plan
  └── audio/                Audio plan
imagen/{id}/                Generated images
videgen/{id}/               Generated videos
audgen/{id}/                Generated audio
```

## Requirements

- [OpenCode](https://opencode.ai) with plugin support
- [Bun](https://bun.sh) runtime
- Higgsfield account (for image/video generation)
- Magnific account (for audio generation)
- Kling
- OpenArt

## MCP Dependencies

Brandly dispatches agents that use these MCP tools:

- `higgsfield_generate_image` — image generation
- `higgsfield_generate_video` — video generation
- `higgsfield_upscale_video` — video upscaling
- `higgsfield_virality_predictor` — virality scoring
- `magnific_audio_music_generate` — music generation
- `magnific_audio_tts` — voiceover generation

## Development

```bash
bun install
bun build src/index.ts --outdir dist --target bun
```

## License

MIT
