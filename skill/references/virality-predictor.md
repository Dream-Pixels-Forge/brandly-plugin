# Virality Predictor Integration

Brandly uses the **Higgsfield Virality Predictor** (`brain_activity`) to score finished videos for virality potential. This is the industry standard for video creative testing.

## What It Measures
- **Hook Strength** — How effectively the video captures attention
- **Sustain** — How long attention is maintained
- **Brain Region Scores** — Visual, Auditory, Language, Attention, Default Mode
- **Overall Virality Score** — Composite score (0-100)

## Scoring Thresholds
| Score | Rating | Action |
|-------|--------|--------|
| 80-100 | Excellent | Ready for publishing |
| 60-79 | Good | Minor improvements recommended |
| 40-59 | Average | Significant re-edit needed |
| 0-39 | Poor | Major rework required |

## Platform-Specific Requirements
| Platform | Minimum Score | Hook Requirement |
|----------|---------------|------------------|
| TikTok | 60+ | Hook in first 1-2 seconds |
| Instagram | 55+ | Hook in first 2-3 seconds |
| YouTube | 50+ | Hook in first 3-5 seconds |
| Twitter/X | 65+ | Hook in first 1-2 seconds |

## Command
```bash
higgsfield generate create brain_activity --video ./finished-video.mp4 --wait
```

## Example Output
```
Overall score: 72/100
Peak hook: 65% at 2s
Sustain: 84%
Strongest region: Visual Cortex (78)
Risk: Default Mode is moderate (32)
Open report: https://app.higgsfield.ai/apps/virality-predictor?resultJobId=...
```
