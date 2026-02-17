import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { logVerbose } from "../../globals.js";
import type { CommandHandler } from "./commands-types.js";

const CLAUDE_MD_TEMPLATE = `# CLAUDE.md - OpenClaw Persistent Memory

This file contains persistent memory instructions that will be automatically injected into your agent's context at runtime.

## Guidelines

- This file is loaded hierarchically along with global (\`~/.openclaw/CLAUDE.md\`), project-level, and directory-specific memory files
- Content here persists across sessions and is always included in the system prompt
- Use markdown format with clear sections
- Keep instructions concise and focused

## Example

### My Agent's Core Behavior

You are a helpful assistant that focuses on:
- Providing clear, concise answers
- Breaking down complex problems into steps
- Asking clarifying questions when needed

### Preferences

- Use code blocks with language specifiers
- Format lists with markdown bullet points
- Provide examples when helpful
`;

export const handleInitCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const match = params.command.commandBodyNormalized.match(/^\/init(?:\s|$)/i);
  if (!match) {
    return null;
  }

  try {
    const workspaceDir = resolve(params.workspaceDir);
    const claudeMdPath = join(workspaceDir, "CLAUDE.md");

    // Write the template file
    await writeFile(claudeMdPath, CLAUDE_MD_TEMPLATE, "utf-8");
    logVerbose(`Created CLAUDE.md memory file at ${claudeMdPath}`);

    return {
      shouldContinue: false,
      reply: {
        text: `✓ Created CLAUDE.md memory file in your workspace. Edit it to add persistent instructions that will be automatically loaded into your agent's context on every run.`,
      },
    };
  } catch (error) {
    logVerbose(`Failed to create CLAUDE.md: ${String(error)}`);
    return {
      shouldContinue: false,
      reply: {
        text: `Failed to create CLAUDE.md file: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
};
