import type { ToolContext } from "../types";
import { STYLE_COSTS, SHOT_COSTS, VIDEO_STYLES, type VideoStyle } from "../constants";

export function createEstimateTool(ctx: ToolContext) {
  return {
    name: "brandly_estimate",
    description:
      "Estimate credit cost before starting a Brandly project. Shows a breakdown by phase so you can decide on budget.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "Product idea",
        },
        productName: {
          type: "string",
          description: "Product name",
        },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style",
        },
        shotCount: {
          type: "number",
          default: 5,
          minimum: 3,
          maximum: 10,
          description: "Number of shots",
        },
      },
      required: ["idea", "productName"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { style, shotCount } = args;
      const s = (style as VideoStyle) || "cinematic";
      const shots = (shotCount as number) || 5;

      const styleCost = STYLE_COSTS[s] || 200;
      const shotCost = SHOT_COSTS[shots] || 0;
      const totalBase = styleCost + shotCost;

      return {
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
      };
    },
  };
}
