import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolContext } from "../types";

interface CharacterReference {
  id: string;
  name: string;
  type: "person" | "product" | "object" | "animal" | "custom";
  description: string;
  referenceImages: string[];
  attributes: {
    appearance?: string;
    clothing?: string;
    colors?: string[];
    style?: string;
    brand?: string;
    features?: string[];
  };
  consistencyScore?: number;
  usageCount: number;
  lastUsed?: string;
}

interface SceneAssignment {
  sceneIndex: number;
  characterId: string;
  role: "primary" | "secondary" | "background";
  action: string;
  position: string;
  notes: string;
}

interface ConsistencyPlan {
  characters: CharacterReference[];
  assignments: SceneAssignment[];
  rules: {
    maintainAppearance: boolean;
    lockColors: boolean;
    lockClothing: boolean;
    referenceStrength: "strict" | "moderate" | "loose";
  };
}

function generateCharacterId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSceneConsistencyTool(ctx: ToolContext) {
  return tool({
    name: "brandly_scene_consistency",
    description:
      "Lock character and product references across multiple shots for visual consistency. Define characters/products, assign them to scenes, and generate prompts that maintain consistent appearance throughout the video.",
    args: {
      action: tool.schema.enum(
        [
          "create_character",
          "update_character",
          "list_characters",
          "delete_character",
          "assign_to_scene",
          "remove_from_scene",
          "get_scene_plan",
          "generate_consistent_prompt",
          "set_rules",
        ],
        { description: "Action to perform" }
      ),
      projectID: tool.schema.string({ description: "Project ID" }),
      characterId: tool.schema.string({ description: "Character ID (required for update/delete/assign/remove)" }),
      name: tool.schema.string({ description: "Character name" }),
      type: tool.schema.enum(["person", "product", "object", "animal", "custom"], { description: "Character type" }),
      description: tool.schema.string({ description: "Character description for prompt generation" }),
      referenceImages: tool.schema.array(tool.schema.string(), { description: "Paths to reference images" }),
      attributes: tool.schema.object({
        appearance: tool.schema.string(),
        clothing: tool.schema.string(),
        colors: tool.schema.array(tool.schema.string()),
        style: tool.schema.string(),
        brand: tool.schema.string(),
        features: tool.schema.array(tool.schema.string()),
      }),
      sceneIndex: tool.schema.number({ description: "Scene index (0-based)" }),
      role: tool.schema.enum(["primary", "secondary", "background"], { description: "Character role in the scene" }),
      action_description: tool.schema.string({ description: "What the character is doing in the scene" }),
      position: tool.schema.string({ description: "Position in the frame (e.g. left third, center, right third)" }),
      notes: tool.schema.string({ description: "Additional notes for this scene assignment" }),
      basePrompt: tool.schema.string({ description: "Base prompt to enhance with consistency references" }),
      sceneCount: tool.schema.number({ description: "Number of scenes for prompt generation" }),
      rules: tool.schema.object({
        maintainAppearance: tool.schema.boolean(),
        lockColors: tool.schema.boolean(),
        lockClothing: tool.schema.boolean(),
        referenceStrength: tool.schema.enum(["strict", "moderate", "loose"]),
      }),
    },
    execute: async (args) => {
      const { action, projectID } = args;

      const projectDir = join(ctx.directory, ".brandly", "projects", projectID);
      if (!existsSync(projectDir)) {
        throw new Error(`Project ${projectID} not found`);
      }

      const consistencyDir = join(ctx.directory, "consistency", projectID);
      mkdirSync(consistencyDir, { recursive: true });

      const planPath = join(consistencyDir, "plan.json");
      let plan: ConsistencyPlan;

      if (existsSync(planPath)) {
        plan = JSON.parse(readFileSync(planPath, "utf-8"));
      } else {
        plan = {
          characters: [],
          assignments: [],
          rules: {
            maintainAppearance: true,
            lockColors: true,
            lockClothing: true,
            referenceStrength: "moderate",
          },
        };
      }

      const savePlan = () => {
        writeFileSync(planPath, JSON.stringify(plan, null, 2));
      };

      switch (action) {
        case "create_character": {
          const id = generateCharacterId();
          const character: CharacterReference = {
            id,
            name: args.name || "Unnamed Character",
            type: (args.type as CharacterReference["type"]) || "person",
            description: args.description || "",
            referenceImages: args.referenceImages || [],
            attributes: args.attributes || {},
            usageCount: 0,
          };
          plan.characters.push(character);
          savePlan();
          return { output: JSON.stringify({ id, ...character, message: "Character created" }) };
        }

        case "update_character": {
          if (!args.characterId) throw new Error("characterId required");
          const char = plan.characters.find((c) => c.id === args.characterId);
          if (!char) throw new Error("Character not found");

          if (args.name) char.name = args.name;
          if (args.type) char.type = args.type as CharacterReference["type"];
          if (args.description) char.description = args.description;
          if (args.referenceImages) char.referenceImages = args.referenceImages;
          if (args.attributes) {
            char.attributes = { ...char.attributes, ...args.attributes };
          }
          savePlan();
          return { output: JSON.stringify({ id: char.id, ...char, message: "Character updated" }) };
        }

        case "list_characters": {
          return { output: JSON.stringify({ characters: plan.characters }) };
        }

        case "delete_character": {
          if (!args.characterId) throw new Error("characterId required");
          plan.characters = plan.characters.filter((c) => c.id !== args.characterId);
          plan.assignments = plan.assignments.filter(
            (a) => a.characterId !== args.characterId
          );
          savePlan();
          return { output: JSON.stringify({ deleted: args.characterId }) };
        }

        case "assign_to_scene": {
          if (!args.characterId) throw new Error("characterId required");
          if (args.sceneIndex === undefined) throw new Error("sceneIndex required");
          const char = plan.characters.find((c) => c.id === args.characterId);
          if (!char) throw new Error("Character not found");

          plan.assignments = plan.assignments.filter(
            (a) => !(a.sceneIndex === args.sceneIndex && a.characterId === args.characterId)
          );

          const assignment: SceneAssignment = {
            sceneIndex: args.sceneIndex,
            characterId: args.characterId,
            role: (args.role as SceneAssignment["role"]) || "primary",
            action: args.action_description || "",
            position: args.position || "center",
            notes: args.notes || "",
          };
          plan.assignments.push(assignment);

          char.usageCount++;
          char.lastUsed = new Date().toISOString();

          savePlan();
          return { output: JSON.stringify({ assignment, character: char.name, message: `Assigned to scene ${args.sceneIndex}` }) };
        }

        case "remove_from_scene": {
          if (!args.characterId) throw new Error("characterId required");
          if (args.sceneIndex === undefined) throw new Error("sceneIndex required");
          plan.assignments = plan.assignments.filter(
            (a) => !(a.sceneIndex === args.sceneIndex && a.characterId === args.characterId)
          );
          savePlan();
          return { output: JSON.stringify({ removed: args.characterId, scene: args.sceneIndex }) };
        }

        case "get_scene_plan": {
          const scenes = plan.assignments.reduce((acc, a) => {
            if (!acc[a.sceneIndex]) acc[a.sceneIndex] = [];
            const char = plan.characters.find((c) => c.id === a.characterId);
            acc[a.sceneIndex].push({ ...a, characterName: char?.name || "Unknown" });
            return acc;
          }, {} as Record<number, (SceneAssignment & { characterName: string })[]>);

          return { output: JSON.stringify({ plan, scenes, rules: plan.rules }) };
        }

        case "generate_consistent_prompt": {
          const sceneCount = args.sceneCount || 5;
          const basePrompt = args.basePrompt || "";
          const prompts: Array<{ scene: number; prompt: string; references: string[] }> = [];

          for (let i = 0; i < sceneCount; i++) {
            const sceneAssignments = plan.assignments.filter((a) => a.sceneIndex === i);
            const refs: string[] = [];
            const descriptions: string[] = [];

            for (const assignment of sceneAssignments) {
              const char = plan.characters.find((c) => c.id === assignment.characterId);
              if (!char) continue;

              let charRef = char.description;
              if (char.attributes.appearance) charRef += `, ${char.attributes.appearance}`;
              if (char.attributes.clothing && plan.rules.lockClothing) {
                charRef += `, wearing ${char.attributes.clothing}`;
              }
              if (char.attributes.colors && plan.rules.lockColors) {
                charRef += `, colors: ${char.attributes.colors.join(", ")}`;
              }
              if (char.attributes.brand) charRef += `, ${char.attributes.brand} brand`;

              descriptions.push(
                `${char.name} (${assignment.role}): ${charRef} - ${assignment.action} at ${assignment.position}`
              );

              if (char.referenceImages.length > 0) {
                refs.push(...char.referenceImages);
              }
            }

            const scenePrompt = [
              `Scene ${i + 1}:`,
              descriptions.length > 0 ? descriptions.join(". ") : basePrompt,
              plan.rules.maintainAppearance
                ? "[CONSISTENT: maintain character appearance across all scenes]"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            prompts.push({
              scene: i + 1,
              prompt: scenePrompt,
              references: refs,
            });
          }

          return {
            output: JSON.stringify({
              prompts,
              rules: plan.rules,
              charactersUsed: plan.characters.map((c) => ({
                name: c.name,
                type: c.type,
                referenceCount: c.referenceImages.length,
              })),
            }),
          };
        }

        case "set_rules": {
          if (args.rules) {
            plan.rules = { ...plan.rules, ...args.rules };
            savePlan();
          }
          return { output: JSON.stringify({ rules: plan.rules }) };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  });
}
