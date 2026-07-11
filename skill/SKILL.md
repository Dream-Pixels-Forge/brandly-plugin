---
name: brandly
description: Generate viral-ready product marketing videos from a single idea or image. Orchestrates trend research, concept development, AI video generation, quality scoring, and multi-platform publishing — all with strict cost control.
---

# Brandly — AI Product Video Generator

## What This Plugin Does
Brandly turns a product idea + optional image into a complete, platform-ready marketing video. It orchestrates specialized AI agents through a pipeline: trend research → concept → script → asset generation → quality validation → publishing.

## When To Use
Trigger on: "make a product video", "create a marketing video for [product]", "generate a TikTok ad", "make a viral product clip", "Brandly this product", "turn my product into a video"

## The Director's Vision (STAMP, Three-Act, 8-Layer)
Read the full creative frameworks before writing prompts:
→ `references/directors-vision.md`

## Pipeline (provider → analyze → start → run → approve → validate → publish)
Step-by-step commands, dispatch flow, and the 8 pipeline phases:
→ `references/pipeline.md`

## Cost Control
- Every project has a credit budget (default 500)
- The pipeline checks budget before each expensive operation
- If budget runs out, the pipeline pauses and reports what's been spent
- Check with `brandly_status` to see remaining budget
- Model credit costs, free-tier limits, and budget-selection logic:
  → `references/model-costs.md`

## Image & Prompt Quality
- Prompt realism formula, keyword references, and length targets:
  → `references/prompt-optimization.md`
- Higgsfield model list and prompt templates:
  → `references/higgsfield-models.md`

## Virality Scoring
Score finished videos with the Higgsfield Virality Predictor (thresholds, platform requirements, command):
→ `references/virality-predictor.md`

## Project Artifacts & Folder Structure
Where each phase writes its markdown/JSON and where media lands:
→ `references/project-structure.md`

## Download, Export & Re-Editing
- Save generated media locally; package a full project export:
  → `references/download-export.md`
- Re-edit a low-scoring shot: `brandly_re_edit(projectID, shotId, newPrompt)` then re-run the asset phase
- Estimate costs first: `brandly_estimate(idea, productName, style, shotCount)`
- View/update preferences: `brandly_memory(action="view" | "like_hook" | "dislike_hook")`

## Video Editing with Remotion
Trim, concat, overlay, transitions, text/audio/effects, resize, crop, and render:
→ `references/video-editing.md`

## Motion Graphics (Remotion animations)
Presets, animation types, easing modes, element types, and the `brandly_motion_graphics` parameters:
→ `references/motion-graphics.md`

## Remotion Animation Reference
Deep reference for `interpolate()`, `Easing`, `spring()`, `Sequence`, timing best practices, and common pitfalls:
→ `references/remotion-animation.md`

## Abstract Backgrounds (style library)
Premium text-free abstract background prompts for image gen / scene backings, with 10+ remixable variations:
→ `references/abstract-backgrounds.md`

## Tips
- **Run image analysis first** — even before starting a project. The analysis gives you a creative brief you can refine before committing credits.
- Start with a clear product idea — the more specific, the better the concepts
- Include a product image for better visual consistency
- Use preview mode (default) to generate low-res previews before full renders
- After validation, you can re-edit individual shots if the score is low
- The plugin remembers your preferences across projects
- The image analyzer works on any image — competitor products, mood boards, lifestyle shots, packaging mockups
