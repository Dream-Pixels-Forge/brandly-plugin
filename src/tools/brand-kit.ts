import { Tool } from "@opencode-ai/plugin";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ToolContext } from "../types";

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

export function createBrandKitTool(ctx: ToolContext): Tool {
  return {
    name: "brandly_brand_kit",
    description:
      "Manage brand kits — store colors, fonts, logo, tone of voice, voiceover style, and music preferences. Apply a brand kit to a project to auto-apply consistent branding across all generated assets.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["create", "get", "update", "delete", "list", "apply"],
          description: "Action to perform",
        },
        brandKitId: {
          type: "string",
          description: "Brand kit ID (required for get/update/delete/apply)",
        },
        projectID: {
          type: "string",
          description: "Project ID to apply brand kit to (required for apply)",
        },
        name: {
          type: "string",
          description: "Brand kit name",
        },
        colors: {
          type: "object",
          properties: {
            primary: { type: "string" },
            secondary: { type: "string" },
            accent: { type: "string" },
            background: { type: "string" },
            text: { type: "string" },
          },
          description: "Brand colors (hex values)",
        },
        fonts: {
          type: "object",
          properties: {
            heading: { type: "string" },
            body: { type: "string" },
            accent: { type: "string" },
          },
          description: "Font families",
        },
        logo: {
          type: "object",
          properties: {
            url: { type: "string" },
            width: { type: "number" },
            height: { type: "number" },
            position: {
              type: "string",
              enum: ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
            },
          },
          description: "Logo configuration",
        },
        tone: {
          type: "array",
          items: { type: "string" },
          description: "Brand tone keywords (e.g. professional, playful, luxury)",
        },
        tagline: {
          type: "string",
          description: "Brand tagline",
        },
        voiceover: {
          type: "object",
          properties: {
            style: { type: "string" },
            gender: { type: "string" },
            pace: { type: "string", enum: ["slow", "normal", "fast"] },
          },
          description: "Voiceover preferences",
        },
        music: {
          type: "object",
          properties: {
            genre: { type: "string" },
            mood: { type: "string" },
            tempo: { type: "string", enum: ["slow", "medium", "fast"] },
          },
          description: "Music preferences",
        },
      },
      required: ["action"],
    },
    execute: async (input: {
      action: string;
      brandKitId?: string;
      projectID?: string;
      name?: string;
      colors?: Partial<BrandKit["colors"]>;
      fonts?: Partial<BrandKit["fonts"]>;
      logo?: Partial<BrandKit["logo"]>;
      tone?: string[];
      tagline?: string;
      voiceover?: Partial<BrandKit["voiceover"]>;
      music?: Partial<BrandKit["music"]>;
    }) => {
      const brandKitsDir = join(ctx.directory, ".brandly", "brand-kits");
      mkdirSync(brandKitsDir, { recursive: true });

      const getKitPath = (id: string) => join(brandKitsDir, `${id}.json`);

      switch (input.action) {
        case "create": {
          const id = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const kit: BrandKit = {
            name: input.name || "Untitled Brand",
            colors: { ...DEFAULT_BRAND_KIT.colors, ...input.colors },
            fonts: { ...DEFAULT_BRAND_KIT.fonts, ...input.fonts },
            logo: { ...DEFAULT_BRAND_KIT.logo, ...input.logo },
            tone: input.tone || DEFAULT_BRAND_KIT.tone,
            tagline: input.tagline || DEFAULT_BRAND_KIT.tagline,
            voiceover: { ...DEFAULT_BRAND_KIT.voiceover, ...input.voiceover },
            music: { ...DEFAULT_BRAND_KIT.music, ...input.music },
          };
          writeFileSync(getKitPath(id), JSON.stringify(kit, null, 2));
          return { id, ...kit, message: "Brand kit created" };
        }

        case "get": {
          if (!input.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(input.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          return JSON.parse(readFileSync(path, "utf-8"));
        }

        case "update": {
          if (!input.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(input.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          const existing: BrandKit = JSON.parse(readFileSync(path, "utf-8"));
          const updated: BrandKit = {
            ...existing,
            ...(input.name && { name: input.name }),
            ...(input.colors && { colors: { ...existing.colors, ...input.colors } }),
            ...(input.fonts && { fonts: { ...existing.fonts, ...input.fonts } }),
            ...(input.logo && { logo: { ...existing.logo, ...input.logo } }),
            ...(input.tone && { tone: input.tone }),
            ...(input.tagline !== undefined && { tagline: input.tagline }),
            ...(input.voiceover && { voiceover: { ...existing.voiceover, ...input.voiceover } }),
            ...(input.music && { music: { ...existing.music, ...input.music } }),
          };
          writeFileSync(path, JSON.stringify(updated, null, 2));
          return { id: input.brandKitId, ...updated, message: "Brand kit updated" };
        }

        case "delete": {
          if (!input.brandKitId) throw new Error("brandKitId required");
          const path = getKitPath(input.brandKitId);
          if (!existsSync(path)) throw new Error("Brand kit not found");
          const { rmSync } = await import("node:fs");
          rmSync(path);
          return { deleted: input.brandKitId };
        }

        case "list": {
          const { readdirSync } = await import("node:fs");
          if (!existsSync(brandKitsDir)) return { kits: [] };
          const files = readdirSync(brandKitsDir).filter((f) => f.endsWith(".json"));
          const kits = files.map((f) => {
            const id = f.replace(".json", "");
            const kit: BrandKit = JSON.parse(
              readFileSync(join(brandKitsDir, f), "utf-8")
            );
            return { id, name: kit.name };
          });
          return { kits };
        }

        case "apply": {
          if (!input.brandKitId) throw new Error("brandKitId required");
          if (!input.projectID) throw new Error("projectID required");
          const kitPath = getKitPath(input.brandKitId);
          if (!existsSync(kitPath)) throw new Error("Brand kit not found");
          const kit: BrandKit = JSON.parse(readFileSync(kitPath, "utf-8"));

          const projectDir = join(ctx.directory, ".brandly", "projects", input.projectID);
          if (!existsSync(projectDir)) throw new Error("Project not found");
          const projectPath = join(projectDir, "project.json");
          const project = JSON.parse(readFileSync(projectPath, "utf-8"));

          project.brandKit = {
            id: input.brandKitId,
            ...kit,
          };
          writeFileSync(projectPath, JSON.stringify(project, null, 2));

          return {
            applied: input.brandKitId,
            projectID: input.projectID,
            brand: kit.name,
            message: `Brand kit "${kit.name}" applied to project`,
          };
        }

        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    },
  };
}
