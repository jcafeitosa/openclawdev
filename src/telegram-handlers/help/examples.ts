import type { CommandHandler } from "../types";

export const handleExamples: CommandHandler = async (ctx, _args) => {
  const examples = `
**📝 Command Examples**

*Agent Management:*
\`/agents\` - List all agents
\`/agent backend-architect\` - Show agent details
\`/spawn deep-research Analyze GraphQL\` - Spawn research

*Discovery:*
\`/find react\` - Find React experts
\`/who backend\` - Who handles backend

*Actions:*
\`/research Next.js 15\` - Research topic
\`/review API security\` - Request review

Use \`/help <command>\` for details
`.trim();

  await ctx.replyWithMarkdown(examples);
};
