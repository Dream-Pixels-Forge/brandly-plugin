import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { STYLE_COSTS, SHOT_COSTS, VIDEO_STYLES, type VideoStyle } from "../constants";

export function createEstimateTool(ctx: ToolContext) {
  return tool({
    description:
      "Estimate credit cost before starting a Brandly project. Shows a breakdown by phase so you can decide on budget.",
    args: {
      idea: tool.schema.string().describe("Product idea"),
      productName: tool.schema.string().describe("Product name"),
      style: tool.schema.enum(VIDEO_STYLES).optional().describe("Video style"),
      shotCount: tool.schema.number().default(5).describe("Number of shots (3-10)"),
    },
    async execute(args) {
      const s = (args.style as VideoStyle) || "cinematic";
      const shots = args.shotCount || 5;

      const styleCost = STYLE_COSTS[s] || 200;
      const shotCost = SHOT_COSTS[shots] || 0;
      const totalBase = styleCost + shotCost;

      return {
        output: JSON.stringify({
          style: s,
          shotCount: shots,
          breakdown: {
            styleCost,
            shotCost,
            totalBase,
          },
          phaseEstimates: {
            init: 0,
            trends: 10,
            concept: Math.round(totalBase * 0.15),
            script: Math.round(totalBase * 0.2),
            asset: Math.round(totalBase * 0.25),
            audio: Math.round(totalBase * 0.15),
            re_edit: 20,
            validate: 10,
            publish: 5,
          },
          totalEstimate: totalBase + 60,
          recommendation: `A ${s} style with ${shots} shots will cost approximately ${totalBase + 60} credits.`,
        }),
      };
    },
  });
}
