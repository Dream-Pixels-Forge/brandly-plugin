import { tool } from "@opencode-ai/plugin";
import { Memory } from "../memory";
import type { ToolContext } from "../types";

export function createMemoryTool(ctx: ToolContext) {
  const memory = new Memory(ctx.directory);

  return tool({
    description:
      "View or update your Brandly preferences. Like/dislike hooks, set preferred style, or reset memory.",
    args: {
      action: tool.schema
        .enum(["view", "like_hook", "dislike_hook", "reset"])
        .describe("Action to perform"),
      hook: tool.schema.string().optional().describe("Hook text to like or dislike"),
    },
    async execute(args) {
      switch (args.action) {
        case "view": {
          const prefs = memory.get();
          return {
            output: JSON.stringify({
              exists: memory.exists(),
              preferences: prefs,
              message: memory.exists()
                ? "Loaded existing preferences"
                : "No preferences found",
            }),
          };
        }

        case "like_hook": {
          if (!args.hook) throw new Error("Hook text required");
          const current = memory.get();
          const liked = current.likedHooks || [];
          if (!liked.includes(args.hook)) {
            liked.push(args.hook);
          }
          const disliked = (current.dislikedHooks || []).filter(
            (h: string) => h !== args.hook
          );
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return {
            output: JSON.stringify({ liked: args.hook, message: `Liked hook: "${args.hook}"` }),
          };
        }

        case "dislike_hook": {
          if (!args.hook) throw new Error("Hook text required");
          const current = memory.get();
          const disliked = current.dislikedHooks || [];
          if (!disliked.includes(args.hook)) {
            disliked.push(args.hook);
          }
          const liked = (current.likedHooks || []).filter(
            (h: string) => h !== args.hook
          );
          memory.update({ likedHooks: liked, dislikedHooks: disliked });
          await memory.save();
          return {
            output: JSON.stringify({ disliked: args.hook, message: `Disliked hook: "${args.hook}"` }),
          };
        }

        case "reset": {
          memory.update({
            likedHooks: [],
            dislikedHooks: [],
            preferredStyle: undefined,
            lastUsedStyle: undefined,
          });
          await memory.save();
          return {
            output: JSON.stringify({ message: "Memory reset" }),
          };
        }

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    },
  });
}
