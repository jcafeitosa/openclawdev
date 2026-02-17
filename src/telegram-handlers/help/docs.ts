import { searchMemory } from "../api/openclaw";
import type { CommandHandler } from "../types";
import { truncate } from "../utils";

export const handleDocs: CommandHandler = async (ctx, args) => {
  const topic = args.join(" ");

  if (!topic) {
    await ctx.reply(
      "📚 Documentation\n\nUse /docs <topic> for specific docs\n\nTopics: architecture, security, agents",
    );
    return;
  }

  try {
    const results = await searchMemory(topic, { maxResults: 5 });

    if (results.length === 0) {
      await ctx.reply(`📚 No documentation found for: ${topic}`);
      return;
    }

    let response = `📚 Documentation for: ${topic}\n\n`;
    results.forEach((result, index) => {
      response += `**Result ${index + 1}:** ${result.path}\n`;
      response += `${result.lines}\n\n`;
    });

    await ctx.reply(truncate(response));
  } catch (error) {
    await ctx.reply(
      `📚 Error searching documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
