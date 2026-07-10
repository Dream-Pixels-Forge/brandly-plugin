import { Memory } from "../memory";
import type { ToolContext } from "../types";

export function createMemoryTool(ctx: ToolContext) {
  const memory = new Memory(ctx.directory);

  return {
    name: "brandly_memory",
    description:
      "View or update your Brandly preferences. Like/dislike hooks, set preferred style, or reset memory.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["view", "like_hook", "dislike_hook", "reset"],
          description: "Action to perform",
        },
        hook: {
          type: "string",
          description: "Hook text to like or dislike",
        },
      },
      required: ["action"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { action, hook } = args;

      switch (action) {
        case "view": {
          const prefs = memory.get();
          return {
            exists: memory.exists(),
            preferences: prefs,
            message: memory.exists()
              ? "Loaded existing preferences"
              : "No preferences found",
          };
        }

        case "like_hook": {
          if (!hook) throw new Error("Hook text required");
          const current = memory.get();
          const liked = current.likedHooks || [];
          if (!liked.includes(hook as string)) {
            liked.push(hook as string);
          }
          const disliked = (current.dislikedHooks || []).filter(
            (h: string) => h !== hook
          );
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return { liked: hook, message: `Liked hook: "${hook}"` };
        }

        case "dislike_hook": {
          if (!hook) throw new Error("Hook text required");
          const current = memory.get();
          const disliked = current.dislikedHooks || [];
          if (!disliked.includes(hook as string)) {
            disliked.push(hook as string);
          }
          const liked = (current.likedHooks || []).filter(
            (h: string) => h !== hook
          );
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return { disliked: hook, message: `Disliked hook: "${hook}"` };
        }

        case "reset": {
          memory.update({
            likedHooks: [],
            dislikedHooks: [],
            preferredStyle: undefined,
            lastUsedStyle: undefined,
          });
          await memory.save();
          return { message: "Memory reset" };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  };
}
