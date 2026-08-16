import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolContext } from "../types";

interface CharacterProfile {
  id: string;
  name: string;
  type: "person" | "product" | "object" | "animal" | "mascot" | "custom";
  description: string;
  appearance: {
    physical?: string;
    clothing?: string;
    accessories?: string[];
    colors?: string[];
    style?: string;
    brand?: string;
  };
  references: {
    images: string[];
    videos?: string[];
    trainedModel?: string;
  };
  providers: {
    kling?: { subjectId?: string; elements3Id?: string };
    seedance?: { referenceIds?: string[] };
    higgsfield?: { soulId?: string; elementId?: string };
    openart?: { projectId?: string };
  };
  consistencyScore: number;
  usageCount: number;
  lastUsed?: string;
  tags?: string[];
  createdAt: string;
}

interface ConsistencyGuide {
  characterId: string;
  guidelines: {
    dos: string[];
    donts: string[];
    referenceAngles?: string[];
    lightingNotes?: string;
  };
  sceneAssignments: {
    sceneIndex: number;
    role: "primary" | "secondary" | "background";
    position?: string;
    action?: string;
  }[];
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadCharacters(ctx: ToolContext): CharacterProfile[] {
  const charactersFile = join(ctx.artifactsDir, "characters.json");
  if (existsSync(charactersFile)) {
    try {
      return JSON.parse(readFileSync(charactersFile, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveCharacters(ctx: ToolContext, characters: CharacterProfile[]): void {
  if (!existsSync(ctx.artifactsDir)) {
    mkdirSync(ctx.artifactsDir, { recursive: true });
  }
  writeFileSync(
    join(ctx.artifactsDir, "characters.json"),
    JSON.stringify(characters, null, 2)
  );
}

function loadGuides(ctx: ToolContext): ConsistencyGuide[] {
  const guidesFile = join(ctx.artifactsDir, "consistency-guides.json");
  if (existsSync(guidesFile)) {
    try {
      return JSON.parse(readFileSync(guidesFile, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveGuides(ctx: ToolContext, guides: ConsistencyGuide[]): void {
  if (!existsSync(ctx.artifactsDir)) {
    mkdirSync(ctx.artifactsDir, { recursive: true });
  }
  writeFileSync(
    join(ctx.artifactsDir, "consistency-guides.json"),
    JSON.stringify(guides, null, 2)
  );
}

export function createCharacterConsistencyTool(ctx: ToolContext) {
  return tool({
    name: "brandly_character_consistency",
    description:
      "Advanced character consistency management with multi-provider support. Create character profiles with reference images, manage identity across Kling Elements 3.0, Seedance references, Higgsfield Soul ID, and more. Generate consistency guides, score character fidelity, and breakdown scripts into scenes/shots with character assignments.",
    args: {
      action: tool.schema.enum(
        [
          "create_character",
          "update_character",
          "get_character",
          "list_characters",
          "delete_character",
          "add_reference_image",
          "remove_reference_image",
          "create_consistency_guide",
          "get_consistency_guide",
          "score_consistency",
          "generate_kling_prompt",
          "generate_seedance_prompt",
          "generate_higgsfield_prompt",
          "export_character_bible",
          "breakdown_script",
        ],
        { description: "Action to perform" }
      ),
      characterId: tool.schema.string({ description: "Character ID" }),
      name: tool.schema.string({ description: "Character name" }),
      type: tool.schema.enum(["person", "product", "object", "animal", "mascot", "custom"], { description: "Character type" }),
      description: tool.schema.string({ description: "Character description" }),
      appearance: tool.schema.object({
        physical: tool.schema.string(),
        clothing: tool.schema.string(),
        accessories: tool.schema.array(tool.schema.string()),
        colors: tool.schema.array(tool.schema.string()),
        style: tool.schema.string(),
        brand: tool.schema.string(),
      }),
      referenceImages: tool.schema.array(tool.schema.string(), { description: "Reference image paths or URLs" }),
      provider: tool.schema.enum(["kling", "seedance", "higgsfield", "openart"], { description: "Target provider for prompt generation" }),
      guide: tool.schema.object({
        dos: tool.schema.array(tool.schema.string()),
        donts: tool.schema.array(tool.schema.string()),
        referenceAngles: tool.schema.array(tool.schema.string()),
        lightingNotes: tool.schema.string(),
      }),
      sceneAssignments: tool.schema.array(
        tool.schema.object({
          sceneIndex: tool.schema.number(),
          role: tool.schema.enum(["primary", "secondary", "background"]),
          position: tool.schema.string(),
          action: tool.schema.string(),
        })
      ),
      tags: tool.schema.array(tool.schema.string(), { description: "Tags for categorization" }),
      sceneIndex: tool.schema.number({ description: "Scene index for scoring" }),
      shots: tool.schema.array(tool.schema.string(), { description: "Shot descriptions for consistency scoring" }),
      projectDescription: tool.schema.string({ description: "Project description for prompt generation" }),
      style: tool.schema.string({ description: "Visual style for prompt generation" }),
      script: tool.schema.string({ description: "Script text to breakdown into scenes/shots" }),
      shotDuration: tool.schema.number({ description: "Target duration per shot in seconds (default: 5)" }),
    },
    execute: async (args) => {
      const { action } = args;
      const characters = loadCharacters(ctx);
      const guides = loadGuides(ctx);

      switch (action) {
        case "create_character": {
          const name = args.name;
          if (!name) {
            return { output: JSON.stringify({ success: false, error: "Name is required" }) };
          }

          const character: CharacterProfile = {
            id: generateId("char"),
            name,
            type: (args.type as CharacterProfile["type"]) || "person",
            description: args.description || "",
            appearance: (args.appearance as CharacterProfile["appearance"]) || {},
            references: {
              images: args.referenceImages || [],
            },
            providers: {},
            consistencyScore: 1.0,
            usageCount: 0,
            tags: args.tags || [],
            createdAt: new Date().toISOString(),
          };

          characters.push(character);
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              character,
              message: `Character "${name}" created with ID: ${character.id}`,
            }),
          };
        }

        case "update_character": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const index = characters.findIndex((c) => c.id === charId);
          if (index === -1) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const existing = characters[index];
          if (args.name) existing.name = args.name;
          if (args.type) existing.type = args.type as CharacterProfile["type"];
          if (args.description) existing.description = args.description;
          if (args.appearance) existing.appearance = args.appearance as CharacterProfile["appearance"];
          if (args.tags) existing.tags = args.tags;

          characters[index] = existing;
          saveCharacters(ctx, characters);

          return { output: JSON.stringify({ success: true, character: existing }) };
        }

        case "get_character": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          return { output: JSON.stringify({ success: true, character }) };
        }

        case "list_characters": {
          return {
            output: JSON.stringify({
              success: true,
              characters,
              count: characters.length,
            }),
          };
        }

        case "delete_character": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const filtered = characters.filter((c) => c.id !== charId);
          if (filtered.length === characters.length) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          saveCharacters(ctx, filtered);
          return { output: JSON.stringify({ success: true, message: `Character ${charId} deleted` }) };
        }

        case "add_reference_image": {
          const charId = args.characterId;
          const imageUrl = args.referenceImages?.[0];
          if (!charId || !imageUrl) {
            return { output: JSON.stringify({ success: false, error: "characterId and referenceImages[0] are required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          character.references.images.push(imageUrl);
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              message: `Added reference image to ${character.name}`,
              referenceCount: character.references.images.length,
            }),
          };
        }

        case "remove_reference_image": {
          const charId = args.characterId;
          const imageUrl = args.referenceImages?.[0];
          if (!charId || !imageUrl) {
            return { output: JSON.stringify({ success: false, error: "characterId and referenceImages[0] are required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          character.references.images = character.references.images.filter(
            (img) => img !== imageUrl
          );
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              message: `Removed reference image from ${character.name}`,
              referenceCount: character.references.images.length,
            }),
          };
        }

        case "create_consistency_guide": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const guide: ConsistencyGuide = {
            characterId: charId,
            guidelines: (args.guide as ConsistencyGuide["guidelines"]) || { dos: [], donts: [] },
            sceneAssignments: (args.sceneAssignments as ConsistencyGuide["sceneAssignments"]) || [],
          };

          const filteredGuides = guides.filter((g) => g.characterId !== charId);
          filteredGuides.push(guide);
          saveGuides(ctx, filteredGuides);

          return {
            output: JSON.stringify({
              success: true,
              guide,
              message: `Consistency guide created for "${character.name}"`,
            }),
          };
        }

        case "get_consistency_guide": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const guide = guides.find((g) => g.characterId === charId);
          if (!guide) {
            return { output: JSON.stringify({ success: false, error: `No guide found for character ${charId}` }) };
          }

          return { output: JSON.stringify({ success: true, guide }) };
        }

        case "score_consistency": {
          const charId = args.characterId;
          const shots = args.shots || [];
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          let score = 0.5;
          const refCount = character.references.images.length;
          score += Math.min(refCount * 0.1, 0.3);
          if (character.appearance.physical) score += 0.05;
          if (character.appearance.clothing) score += 0.05;
          if (character.appearance.colors?.length) score += 0.05;
          if (character.appearance.style) score += 0.05;

          const consistencyKeywords = [
            "same", "consistent", "matching", "identical", "maintain", "keep", "preserve",
          ];
          const shotBonus = shots.reduce((acc: number, shot: string) => {
            const hasConsistency = consistencyKeywords.some((kw) =>
              shot.toLowerCase().includes(kw)
            );
            return acc + (hasConsistency ? 0.02 : 0);
          }, 0);

          score = Math.min(score + shotBonus, 1.0);

          character.consistencyScore = Math.round(score * 100) / 100;
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              characterId: charId,
              characterName: character.name,
              consistencyScore: character.consistencyScore,
              factors: {
                referenceImages: refCount,
                hasPhysicalDescription: !!character.appearance.physical,
                hasClothingDescription: !!character.appearance.clothing,
                hasColorPalette: !!character.appearance.colors?.length,
                hasStyleGuide: !!character.appearance.style,
              },
              recommendations:
                score < 0.7
                  ? [
                      "Add more reference images (2-4 recommended)",
                      "Provide detailed physical description",
                      "Define color palette",
                      "Add clothing/style notes",
                    ]
                  : ["Good consistency foundation"],
            }),
          };
        }

        case "generate_kling_prompt": {
          const charId = args.characterId;
          const projectDesc = args.projectDescription || "";
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const prompt = [
            `Subject: ${character.name}`,
            character.description ? `Description: ${character.description}` : "",
            character.appearance.physical ? `Physical: ${character.appearance.physical}` : "",
            character.appearance.clothing ? `Clothing: ${character.appearance.clothing}` : "",
            character.appearance.colors?.length
              ? `Color palette: ${character.appearance.colors.join(", ")}`
              : "",
            projectDesc ? `\nScene: ${projectDesc}` : "",
            `\n[Elements 3.0 Subject Binding - Reference: ${character.references.images.length} images]`,
          ]
            .filter(Boolean)
            .join("\n");

          character.usageCount++;
          character.lastUsed = new Date().toISOString();
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              provider: "kling",
              prompt,
              referenceCount: character.references.images.length,
              elements3Binding: true,
              notes: "Upload reference images as Subject in Kling 3.0 Elements 3.0 library",
            }),
          };
        }

        case "generate_seedance_prompt": {
          const charId = args.characterId;
          const projectDesc = args.projectDescription || "";
          const style = args.style || "cinematic";
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const prompt = [
            `[Style: ${style}]`,
            `Character: ${character.name}`,
            character.appearance.physical ? `Appearance: ${character.appearance.physical}` : "",
            character.appearance.clothing ? `Attire: ${character.appearance.clothing}` : "",
            character.appearance.style ? `Aesthetic: ${character.appearance.style}` : "",
            projectDesc ? `\nScene: ${projectDesc}` : "",
            `\n[Character Lock - Reference: ${character.references.images.length} images]`,
            `[Consistency: Strict - Maintain identity across transitions]`,
          ]
            .filter(Boolean)
            .join("\n");

          character.usageCount++;
          character.lastUsed = new Date().toISOString();
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              provider: "seedance",
              prompt,
              referenceCount: character.references.images.length,
              characterLock: true,
              notes: "Upload reference images as Visual Reference in Seedance 2.5",
            }),
          };
        }

        case "generate_higgsfield_prompt": {
          const charId = args.characterId;
          const projectDesc = args.projectDescription || "";
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const prompt = [
            `Character: ${character.name}`,
            character.description ? `Identity: ${character.description}` : "",
            character.appearance.physical ? `Features: ${character.appearance.physical}` : "",
            character.appearance.clothing ? `Style: ${character.appearance.clothing}` : "",
            projectDesc ? `\nContext: ${projectDesc}` : "",
            `\n[Soul ID Training - ${character.references.images.length} reference images]`,
            character.providers.higgsfield?.soulId
              ? `[Soul ID: ${character.providers.higgsfield.soulId}]`
              : "[Soul ID: Not yet trained]",
          ]
            .filter(Boolean)
            .join("\n");

          character.usageCount++;
          character.lastUsed = new Date().toISOString();
          saveCharacters(ctx, characters);

          return {
            output: JSON.stringify({
              success: true,
              provider: "higgsfield",
              prompt,
              referenceCount: character.references.images.length,
              soulId: character.providers.higgsfield?.soulId || null,
              notes: character.providers.higgsfield?.soulId
                ? "Use Soul ID for identity-faithful generation"
                : "Train Soul ID first with 4-10 reference images",
            }),
          };
        }

        case "export_character_bible": {
          const charId = args.characterId;
          if (!charId) {
            return { output: JSON.stringify({ success: false, error: "characterId is required" }) };
          }

          const character = characters.find((c) => c.id === charId);
          if (!character) {
            return { output: JSON.stringify({ success: false, error: `Character ${charId} not found` }) };
          }

          const guide = guides.find((g) => g.characterId === charId);

          const bible = {
            character,
            consistencyGuide: guide,
            providerInstructions: {
              kling: {
                setup: "Upload reference images to Elements 3.0 library",
                binding: "Select character as Subject for automatic identity binding",
                tips: [
                  "Use 2-4 high-quality reference images",
                  "Include front, side, and 3/4 views",
                  "Consistent lighting across references",
                ],
              },
              seedance: {
                setup: "Upload reference images as Visual References",
                binding: "Character Lock maintains identity across transitions",
                tips: [
                  "Up to 16 reference images supported",
                  "Text-driven character insertion available",
                  "Use video-to-video for existing footage",
                ],
              },
              higgsfield: {
                setup: "Train Soul ID with 4-10 reference images",
                binding: "Soul ID creates reusable identity model",
                tips: [
                  "Use high-quality, well-lit photos",
                  "Include multiple angles",
                  "Training takes ~10 minutes",
                ],
              },
            },
            exportDate: new Date().toISOString(),
          };

          const biblePath = join(ctx.artifactsDir, `character-bible-${charId}.json`);
          writeFileSync(biblePath, JSON.stringify(bible, null, 2));

          return {
            output: JSON.stringify({
              success: true,
              bible,
              savedTo: biblePath,
            }),
          };
        }

        case "breakdown_script": {
          const script = args.script;
          if (!script) {
            return { output: JSON.stringify({ success: false, error: "script is required" }) };
          }

          const shotDuration = args.shotDuration || 5;
          const style = args.style || "cinematic";

          const sceneMarkers = script.match(
            /^#{1,3}\s*(Scene|SCENE|Scene\s*\d+).*$/gm
          );
          const lines = script.split("\n").filter((l) => l.trim());

          const scenes: {
            index: number;
            title: string;
            content: string;
            shots: {
              index: number;
              description: string;
              duration: number;
              characters: string[];
              camera?: string;
              lighting?: string;
            }[];
            characters: string[];
          }[] = [];

          let currentScene: (typeof scenes)[0] | null = null;
          let shotIndex = 0;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const sceneMatch = trimmed.match(
              /^#{1,3}\s*(?:Scene|SCENE)\s*(\d+)?:?\s*[-:]?\s*(.*)$/i
            );
            if (sceneMatch) {
              if (currentScene) {
                scenes.push(currentScene);
              }
              currentScene = {
                index: scenes.length + 1,
                title: sceneMatch[2] || `Scene ${sceneMatch[1] || scenes.length + 1}`,
                content: "",
                shots: [],
                characters: [],
              };
              shotIndex = 0;
              continue;
            }

            if (!currentScene) {
              currentScene = {
                index: 1,
                title: "Scene 1",
                content: "",
                shots: [],
                characters: [],
              };
            }

            currentScene.content += trimmed + "\n";

            const charMatches = trimmed.match(
              /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g
            );
            if (charMatches) {
              for (const char of charMatches) {
                const skipWords = [
                  "The", "This", "That", "When", "Then", "What", "Where", "How",
                  "Why", "Who", "Which", "Scene", "Shot", "Cut", "Fade", "Camera",
                  "INT", "EXT", "Interior", "Exterior",
                ];
                if (
                  !skipWords.includes(char) &&
                  !currentScene.characters.includes(char)
                ) {
                  currentScene.characters.push(char);
                }
              }
            }

            const isAction =
              trimmed.includes(".") &&
              !trimmed.startsWith("[") &&
              !trimmed.startsWith("(");
            const isDialogue = trimmed.startsWith('"') || trimmed.startsWith("\u201C");
            const isDirection = trimmed.startsWith("[") || trimmed.startsWith("(");

            if (isAction || isDialogue || isDirection) {
              const existingCharInShot = currentScene.characters.length > 0
                ? currentScene.characters
                : [];

              currentScene.shots.push({
                index: ++shotIndex,
                description: trimmed.replace(/[[\]()"]/g, "").trim(),
                duration: isDialogue ? shotDuration + 2 : shotDuration,
                characters: existingCharInShot,
                camera: isDirection ? trimmed : undefined,
              });
            }
          }

          if (currentScene) {
            scenes.push(currentScene);
          }

          let totalDuration = 0;
          const shotList = scenes.flatMap((scene) =>
            scene.shots.map((shot) => {
              totalDuration += shot.duration;
              return {
                scene: scene.index,
                shot: shot.index,
                globalShot: totalDuration / shot.duration,
                description: shot.description,
                duration: shot.duration,
                timestamp: totalDuration - shot.duration,
                characters: shot.characters,
                camera: shot.camera,
              };
            })
          );

          const allSceneChars = scenes.flatMap((s) => s.characters);
          const uniqueChars = [...new Set(allSceneChars)];
          const matchedCharacters = uniqueChars
            .map((name) => {
              const existing = characters.find(
                (c) =>
                  c.name.toLowerCase() === name.toLowerCase() ||
                  c.name.includes(name) ||
                  name.includes(c.name)
              );
              return {
                name,
                existingCharacter: existing || null,
                needsCreation: !existing,
              };
            })
            .filter(
              (c) => c.needsCreation || c.existingCharacter
            );

          const providerPrompts = {
            kling: scenes.map((scene) => ({
              scene: scene.index,
              prompt: `Scene ${scene.index}: ${scene.title}\nCharacters: ${scene.characters.join(", ")}\n[Elements 3.0 Subject Binding]`,
            })),
            seedance: scenes.map((scene) => ({
              scene: scene.index,
              prompt: `[Style: ${style}] Scene ${scene.index}: ${scene.title}\nCharacters: ${scene.characters.join(", ")}\n[Character Lock]`,
            })),
            higgsfield: scenes.map((scene) => ({
              scene: scene.index,
              prompt: `Scene ${scene.index}: ${scene.title}\nCharacters: ${scene.characters.join(", ")}\n[Soul ID Reference]`,
            })),
          };

          return {
            output: JSON.stringify({
              success: true,
              breakdown: {
                sceneCount: scenes.length,
                shotCount: shotList.length,
                totalDuration,
                estimatedVideoLength: `${Math.ceil(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, "0")}`,
                scenes: scenes.map((s) => ({
                  index: s.index,
                  title: s.title,
                  shotCount: s.shots.length,
                  characters: s.characters,
                  content: s.content.trim(),
                })),
                shotList,
                characters: matchedCharacters,
                providerPrompts,
              },
              recommendations: {
                shotsPerScene: scenes.map((s) =>
                  s.shots.length < 2
                    ? `Scene ${s.index}: Consider adding more shots for visual variety`
                    : null
                ).filter(Boolean),
                characterConsistency: matchedCharacters.filter((c) => c.needsCreation).length > 0
                  ? `Create character profiles for: ${matchedCharacters.filter((c) => c.needsCreation).map((c) => c.name).join(", ")}`
                  : "All characters have existing profiles",
              },
            }),
          };
        }

        default:
          return { output: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) };
      }
    },
  });
}
