import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "../types";

export function createTemplatesTool(ctx: ToolContext) {
  return tool({
    description:
      "List available Brandly video style templates with details. Returns template names, descriptions, and usage guidance.",
    args: {
      template: tool.schema
        .string()
        .optional()
        .describe("Optional template name to get details for (cinematic, ugc, montage). If omitted, lists all templates."),
    },
    async execute(args) {
      const templatesDir = join(ctx.directory, "templates");

      try {
        const files = readdirSync(templatesDir).filter((f: string) =>
          f.endsWith(".json")
        );

        if (files.length === 0) {
          return {
            output: JSON.stringify({
              content: "No templates found. The templates directory is empty.",
            }),
          };
        }

        const templateNames = files.map((f: string) => f.replace(".json", ""));

        if (args.template) {
          const requested = args.template.toLowerCase();
          if (!templateNames.includes(requested)) {
            return {
              output: JSON.stringify({
                content: `Template "${requested}" not found. Available: ${templateNames.join(", ")}`,
              }),
            };
          }

          const filePath = join(templatesDir, `${requested}.json`);
          const content = JSON.parse(readFileSync(filePath, "utf-8"));

          return {
            output: JSON.stringify({
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
            }),
          };
        }

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
          output: JSON.stringify({
            availableTemplates: summaries,
            usage:
              "Call brandly_templates(template='cinematic') for full details on a specific template.",
          }),
        };
      } catch (error) {
        return {
          output: JSON.stringify({
            content: `Error reading templates: ${error instanceof Error ? error.message : "Unknown error"}`,
          }),
        };
      }
    },
  });
}
