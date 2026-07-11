# Folder Structure — Project Artifacts & Generated Files

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

## What Gets Saved Where
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

## Reusing Artifacts
All `.brandly/` artifacts are human-readable markdown — browse, copy, and remix freely.
Generated files in `imagen/`, `videgen/`, and `audgen/` are organized per-project for easy location.
