import { tool } from "@opencode-ai/plugin";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolContext } from "../types";

interface BrandKit {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  logo: {
    url: string;
    width: number;
    height: number;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  };
  tone: string[];
  tagline: string;
  voiceover: {
    style: string;
    gender: string;
    pace: "slow" | "normal" | "fast";
  };
  music: {
    genre: string;
    mood: string;
    tempo: "slow" | "medium" | "fast";
  };
}

const DEFAULT_BRAND_KIT: BrandKit = {
  name: "Default Brand",
  colors: {
    primary: "#000000",
    secondary: "#FFFFFF",
    accent: "#FF0000",
    background: "#000000",
    text: "#FFFFFF",
  },
  fonts: {
    heading: "Inter",
    body: "Inter",
    accent: "Inter",
  },
  logo: {
    url: "",
    width: 200,
    height: 60,
    position: "top-right",
  },
  tone: ["professional", "modern"],
  tagline: "",
  voiceover: {
    style: "professional",
    gender: "neutral",
    pace: "normal",
  },
  music: {
    genre: "ambient",
    mood: "upbeat",
    tempo: "medium",
  },
};

export function createBrandKitTool(ctx: ToolContext) {
  return tool({
    description:
      "Manage brand kits — store colors, fonts, logo, tone of voice, voiceover style, and music preferences. Apply a brand kit to a project to auto-apply consistent branding across all generated assets.",
    args: {
      action: tool.schema
        .enum(["create", "get", "update", "delete", "list", "apply"])
        .describe("Action to perform"),
      brandKitId: tool.schema.string().optional().describe("Brand kit ID (required for get/update/delete/apply)"),
      projectID: tool.schema.string().optional().describe("Project ID to apply brand kit to (required for apply)"),
      name: tool.schema.string().optional().describe("Brand kit name"),
    },
    async execute(args) {
      const brandKitsDir = join(ctx.directory, ".brandly", "brand-kits");
      mkdirSync(brandKitsDir, { recursive: true });

      const getKitPath = (id: string) => join(brandKitsDir, `${id}.json`);

      switch (args.action) {
        case "create": {
          const id = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const kit: BrandKit = {
            name: args.name || "Untitled Brand",
            colors: DEFAULT_BRAND_KIT.colors,
            fonts: DEFAULT_BRAND_KIT.fonts,
            logo: DEFAULT_BRAND_KIT.logo,
            tone: DEFAULT_BRAND_KIT.tone,
            tagline: DEFAULT_BRAND_KIT.tagline,
            voiceover: DEFAULT_BRAND_KIT.voiceover,
            music: DEFAULT_BRAND_KIT.music,
          };
          writeFileSync(getKitPath(id), JSON.stringify(kit, null, 2));
          return {
            output: JSON.stringify({ id, ...kit, message: "Brand kit created" }),
          };
        }

        case "get": {
          if (!args.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(args.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          return {
            output: JSON.stringify(JSON.parse(readFileSync(path, "utf-8"))),
          };
        }

        case "update": {
          if (!args.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(args.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          const existing: BrandKit = JSON.parse(readFileSync(path, "utf-8"));
          if (args.name) existing.name = args.name;
          writeFileSync(path, JSON.stringify(existing, null, 2));
          return {
            output: JSON.stringify({ id: args.brandKitId, ...existing, message: "Brand kit updated" }),
          };
        }

        case "delete": {
          if (!args.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(args.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          const { rmSync } = await import("node:fs");
          rmSync(path);
          return {
            output: JSON.stringify({ deleted: args.brandKitId }),
          };
        }

        case "list": {
          const { readdirSync } = await import("node:fs");
          if (!existsSync(brandKitsDir)) return { output: JSON.stringify({ kits: [] }) };
          const files = readdirSync(brandKitsDir).filter((f) => f.endsWith(".json"));
          const kits = files.map((f) => {
            const id = f.replace(".json", "");
            const kit: BrandKit = JSON.parse(
              readFileSync(join(brandKitsDir, f), "utf-8")
            );
            return { id, name: kit.name };
          });
          return {
            output: JSON.stringify({ kits }),
          };
        }

        case "apply": {
          if (!args.brandKitId) throw new Error("brandKitId required");
          if (!args.projectID) throw new Error("projectID required");
          const kitPath = getKitPath(args.brandKitId);
          if (!existsSync(kitPath)) throw new Error("Brand kit not found");
          const kit: BrandKit = JSON.parse(readFileSync(kitPath, "utf-8"));

          const projectDir = join(ctx.directory, ".brandly", "projects", args.projectID);
          if (!existsSync(projectDir)) throw new Error("Project not found");
          const projectPath = join(projectDir, "project.json");
          const project = JSON.parse(readFileSync(projectPath, "utf-8"));

          project.brandKit = {
            id: args.brandKitId,
            ...kit,
          };
          writeFileSync(projectPath, JSON.stringify(project, null, 2));

          return {
            output: JSON.stringify({
              applied: args.brandKitId,
              projectID: args.projectID,
              brand: kit.name,
              message: `Brand kit "${kit.name}" applied to project`,
            }),
          };
        }

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    },
  });
}
