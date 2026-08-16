import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";
import { isValidProjectId } from "../constants";

export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  models: string[];
  bestFor: string[];
  cliCommand?: string;
  mcpTool?: string;
}

export const AVAILABLE_PROVIDERS: ProviderConfig[] = [
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    description: "Comprehensive AI generation platform with image, video, 3D, and audio models",
    capabilities: ["image", "video", "3d", "audio", "marketing", "virality"],
    models: [
      "GPT Image 2",
      "Seedance 2.0",
      "Kling 3.0",
      "Soul 2.0",
      "Cinema Studio Video 3.0",
      "Marketing Studio",
      "Virality Predictor"
    ],
    bestFor: [
      "High-fidelity product shots",
      "Branded marketing videos",
      "Character consistency",
      "Virality scoring",
      "Marketing Studio ads"
    ],
    mcpTool: "higgsfield"
  },
  {
    id: "kling",
    name: "Kling AI (可灵)",
    description: "Chinese AI video generation platform with strong motion and physics",
    capabilities: ["image", "video"],
    models: [
      "Kling 3.0",
      "Kling 3.0 Omni",
      "Kling 2.6"
    ],
    bestFor: [
      "Realistic human motion",
      "Multi-character scenes",
      "Budget-friendly video",
      "Chinese market content"
    ],
    cliCommand: "kling"
  },
  {
    id: "openart",
    name: "OpenArt",
    description: "Community AI art platform with diverse models and styles",
    capabilities: ["image", "video"],
    models: [
      "Stable Diffusion",
      "DALL-E",
      "Midjourney",
      "Various community models"
    ],
    bestFor: [
      "Artistic and creative styles",
      "Community models",
      "Experimental aesthetics",
      "Budget-friendly generation"
    ]
  },
  {
    id: "magnific",
    name: "Magnific AI",
    description: "AI image upscaling and enhancement platform",
    capabilities: ["image", "upscale", "enhance"],
    models: [
      "Magnific Upscaler",
      "Magnific Enhancer"
    ],
    bestFor: [
      "Image upscaling",
      "Quality enhancement",
      "Resolution improvement",
      "Detail restoration"
    ]
  },
  {
    id: "runway",
    name: "Runway ML",
    description: "Professional AI video generation and editing platform",
    capabilities: ["video", "image"],
    models: [
      "Gen-4.5",
      "Gen-3 Alpha",
      "Act-Two"
    ],
    bestFor: [
      "Cinematic video quality",
      "Character performance",
      "Professional editing",
      "Film-grade output"
    ]
  },
  {
    id: "pika",
    name: "Pika Labs",
    description: "Creative AI video generation with stylized effects",
    capabilities: ["video", "image"],
    models: [
      "Pika 2.5",
      "Pika 2.0"
    ],
    bestFor: [
      "Stylized and experimental",
      "Creative effects",
      "Social media content",
      "Quick iterations"
    ]
  }
];

export function createProviderTool(ctx: ToolContext) {
  return tool({
    description:
      "Select the AI generation provider for the Brandly pipeline. Shows available providers and lets the user choose their preferred platform for image/video generation.",
    args: {
      projectID: tool.schema
        .string()
        .optional()
        .describe("The project UUID (optional — if provided, saves provider preference to project)"),
      providerId: tool.schema
        .enum(AVAILABLE_PROVIDERS.map((p) => p.id as any))
        .optional()
        .describe("Provider ID to select (if known). If not provided, shows available providers."),
      listOnly: tool.schema
        .boolean()
        .optional()
        .describe("If true, only lists available providers without selecting one"),
    },
    async execute(args) {
      if (args.listOnly || !args.providerId) {
        const providers = AVAILABLE_PROVIDERS.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          capabilities: p.capabilities,
          models: p.models.slice(0, 5),
          bestFor: p.bestFor.slice(0, 3),
        }));

        return {
          output: JSON.stringify({
            status: "listed",
            providers,
            message: `Found ${providers.length} available providers. Select one by ID.`,
            recommendation: getProviderRecommendation(),
          }),
        };
      }

      const provider = AVAILABLE_PROVIDERS.find((p) => p.id === args.providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${args.providerId}`);
      }

      if (args.projectID) {
        const project = await ctx.readProject(args.projectID);
        if (project) {
          if (!project.phases) {
            project.phases = {};
          }

          const currentPhase = project.currentPhase as string;
          if (!project.phases[currentPhase]) {
            project.phases[currentPhase] = {
              status: "running",
              startedAt: new Date().toISOString(),
            };
          }

          const phaseOutput = project.phases[currentPhase].output
            ? JSON.parse(project.phases[currentPhase].output || "{}")
            : {};

          phaseOutput.selectedProvider = {
            id: provider.id,
            name: provider.name,
            selectedAt: new Date().toISOString(),
          };

          project.phases[currentPhase].output = JSON.stringify(phaseOutput);
          project.updatedAt = new Date().toISOString();
          await ctx.writeProject(args.projectID, project);
        }
      }

      return {
        output: JSON.stringify({
          projectId: args.projectID,
          provider: {
            id: provider.id,
            name: provider.name,
            description: provider.description,
            capabilities: provider.capabilities,
            models: provider.models,
            bestFor: provider.bestFor,
            cliCommand: provider.cliCommand,
            mcpTool: provider.mcpTool,
          },
          status: "selected",
          message: `Selected ${provider.name} for media generation`,
          usage: getProviderUsage(provider),
        }),
      };
    },
  });
}

function getProviderRecommendation(): string {
  return `
**Recommendation Guide:**

• **For product videos/ads** → Higgsfield (Marketing Studio) or Runway (Gen-4.5)
• **For character consistency** → Higgsfield (Soul 2.0) or Kling (Omni)
• **For budget-friendly** → Kling 3.0 or OpenArt
• **For cinematic quality** → Runway (Gen-4.5) or Higgsfield (Cinema Studio)
• **For Chinese market** → Kling AI (可灵)
• **For image upscaling** → Magnific AI
• **For experimental/creative** → Pika or OpenArt
• **For virality scoring** → Higgsfield (Virality Predictor)
`;
}

function getProviderUsage(provider: ProviderConfig): string {
  switch (provider.id) {
    case "higgsfield":
      return `
**Higgsfield Usage:**
\`\`\`bash
# Image generation
higgsfield generate create gpt_image_2 --prompt "..." --wait

# Video generation
higgsfield generate create seedance_2_0 --prompt "..." --duration 12 --wait

# Marketing video
higgsfield generate create marketing_studio_video --prompt "..." --mode ugc --wait

# Virality scoring
higgsfield generate create brain_activity --video ./video.mp4 --wait
\`\`\`
`;
    case "kling":
      return `
**Kling Usage:**
\`\`\`bash
# Login first
kling login

# Check capabilities
kling who_am_i

# Image generation
kling text_to_image --model <model> "prompt"

# Video generation
kling text_to_video --model <model> --duration 5 "prompt"

# Image to video
kling image_to_video --model <model> --image ./image.png "prompt"
\`\`\`
`;
    case "openart":
      return `
**OpenArt Usage:**
Visit https://openart.ai and use their web interface or API.
Supports Stable Diffusion, DALL-E, Midjourney, and community models.
`;
    case "magnific":
      return `
**Magnific Usage:**
Visit https://magnific.ai and use their web interface or API.
Specialized for image upscaling and enhancement.
`;
    case "runway":
      return `
**Runway Usage:**
Visit https://runwayml.com and use their web interface or API.
Supports Gen-4.5, Gen-3 Alpha, and Act-Two for character performance.
`;
    case "pika":
      return `
**Pika Usage:**
Visit https://pika.art and use their web interface or API.
Specialized for stylized and experimental video content.
`;
    default:
      return "";
  }
}
