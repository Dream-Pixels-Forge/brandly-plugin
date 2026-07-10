import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolContext } from "../types";

export function createTemplatesTool(ctx: ToolContext) {
  return {
    name: "brandly_templates",
    description:
      "List available Brandly video style templates with details. Returns template names, descriptions, and usage guidance.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description:
            "Optional template name to get details for (cinematic, ugc, montage). If omitted, lists all templates.",
        },
      },
    },
    execute: async (args: Record<string, unknown>) => {
      const { template } = args;
      const templatesDir = join(ctx.directory, "templates");

      try {
        const files = readdirSync(templatesDir).filter((f: string) =>
          f.endsWith(".json")
        );

        if (files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No templates found. The templates directory is empty.",
              },
            ],
          };
        }

        const templateNames = files.map((f: string) => f.replace(".json", ""));

        if (template) {
          const requested = (template as string).toLowerCase();
          if (!templateNames.includes(requested)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Template "${requested}" not found. Available: ${templateNames.join(", ")}`,
                },
              ],
            };
          }

          const filePath = join(templatesDir, `${requested}.json`);
          const content = JSON.parse(readFileSync(filePath, "utf-8"));

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    name: content.name,
                    description: content.description,
                    style: content.style,
                    duration: content.duration,
                    hooks: content.hooks,
                    narrative: content.narrative,
                    camera: content.camera,
                    lighting: content.lighting,
                    music: content.music,
                    platforms: content.platforms,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // List all templates
        const summaries = templateNames.map((name: string) => {
          const filePath = join(templatesDir, `${name}.json`);
          const content = JSON.parse(readFileSync(filePath, "utf-8"));
          return {
            name: content.name,
            description: content.description,
            style: content.style,
            optimalDuration: content.duration?.optimal,
            hooks: content.hooks?.slice(0, 2),
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  availableTemplates: summaries,
                  usage:
                    "Call brandly_templates(template='cinematic') for full details on a specific template.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error reading templates: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  };
}
