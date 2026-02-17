/**
 * /help command handler
 * Show help for all commands or specific command
 */

import type { CommandHandler } from "../types";
import { loadConfig } from "../utils";

interface CommandInfo {
  description: string;
  usage: string;
  examples: string[];
  category: string;
  permissions: string;
}

interface CategoryInfo {
  name: string;
  icon: string;
}

export const handleHelp: CommandHandler = async (ctx, args) => {
  const commandName = args[0];

  const config = loadConfig();
  const commands = (config.channels?.telegram?.commands?.commands || {}) as Record<
    string,
    CommandInfo
  >;
  const categories = (config.channels?.telegram?.commands?.categories || {}) as Record<
    string,
    CategoryInfo
  >;

  if (commandName) {
    // Show help for specific command
    const cmd = commands[commandName];

    if (!cmd) {
      await ctx.reply(`❌ Command not found: ${commandName}`);
      return;
    }

    const response = `
**/${commandName}**

${cmd.description}

**Usage:** \`${cmd.usage}\`

**Examples:**
${cmd.examples.map((ex) => `  \`${ex}\``).join("\n")}

**Category:** ${cmd.category}
**Permissions:** ${cmd.permissions}
`.trim();

    await ctx.replyWithMarkdown(response);
    return;
  }

  // Show all commands grouped by category
  let response = "**🤖 OpenClaw Commands**\n\n";

  for (const [catId, catInfo] of Object.entries(categories)) {
    const catCommands = Object.entries(commands)
      .filter(([_, cmd]) => cmd.category === catId)
      .map(([name, cmd]) => `  \`/${name}\` - ${cmd.description}`)
      .join("\n");

    if (catCommands) {
      response += `**${catInfo.icon} ${catInfo.name}**\n${catCommands}\n\n`;
    }
  }

  response += "\nUse `/help <command>` for details\nUse `/examples` for examples";

  await ctx.replyWithMarkdown(response);
};
