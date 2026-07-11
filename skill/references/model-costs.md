# Image Generation — Model Costs & Selection

## Credit Costs (Images)
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

## Video Costs (per second, approximate)
| Model | Credits/sec | Max Duration | Notes |
|---|---|---|---|
| Kling 3.0 Turbo | ~2-3 | 5-10s | Cheapest for simple motion |
| Kling 3.0 | ~3-5 | 15s | Best value for product showcases |
| Minimax Hailuo | ~3-5 | 5-10s | Cheap, strong physics |
| Seedance 1.5 Pro | ~4-6 | 10s | Budget clean single-take |
| Seedance 2.0 | ~5-8 | 15s | SOTA quality, identity lock |
| Veo 3.1 Lite | ~5-8 | 8s | Fast batch work |

## Free Tier
- 10 daily credits, watermarked, 720p max
- ~4 Z Image drafts OR ~5 Nano Banana 2 outputs per day
- No commercial license

## Unlimited Passes (Plus plan and up)
- Kling 3.0, Flux 2.0 Pro, Seedream 5.0 Lite, Nano Banana 2, Soul 2.0, Soul Cinema
- Nano Banana Pro unlimited only at Ultra tier ($99/mo annual)

## Budget Selection Logic
```
previewMode → Z Image (0.25 cr) + Kling 3.0 Turbo

budget < 50 → Nano Banana 2 (2 cr) + Kling 3.0
budget 50-150 → Soul 2.0 hero + Nano Banana 2 supporting + Seedance 2.0
budget > 150 → GPT Image 2 / Nano Banana Pro + Seedance 2.0
```
