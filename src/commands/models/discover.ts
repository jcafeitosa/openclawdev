import { runModelDiscovery } from "../../agents/discovery/orchestrator.js";
import type { RuntimeEnv } from "../../runtime.js";

export async function modelsDiscoverCommand(_opts: { json?: boolean }, runtime: RuntimeEnv) {
  runtime.log("Starting model discovery...");

  const models = await runModelDiscovery();

  if (_opts.json) {
    runtime.log(JSON.stringify(models, null, 2));
    return;
  }

  if (models.length === 0) {
    runtime.log("No models discovered. Check your API keys.");
    return;
  }

  runtime.log(`Discovered ${models.length} models across providers.`);

  const freeModels = models.filter((m) => m.isFree || m.tags?.includes("emergency-free"));
  if (freeModels.length > 0) {
    runtime.log(`
\u001b[32mFREE / EMERGENCY MODELS DISCOVERED:\u001b[0m`);
    for (const m of freeModels) {
      const tagStr = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
      const label = m.displayName || m.name || m.id;
      runtime.log(`  \u001b[1m${m.provider}/${m.id}\u001b[0m (${label})${tagStr}`);
    }
  }

  // Group by provider for nice output
  const byProvider = new Map<string, typeof models>();
  for (const m of models) {
    const list = byProvider.get(m.provider) ?? [];
    list.push(m);
    byProvider.set(m.provider, list);
  }

  for (const [provider, items] of byProvider) {
    runtime.log(`
${provider.toUpperCase()}:`);
    for (const m of items.slice(0, 10)) {
      // Limit output
      const freeMarker = m.isFree ? " \u001b[32m(FREE)\u001b[0m" : "";
      const label = m.displayName || m.name || m.id;
      runtime.log(
        `  - ${m.id}${freeMarker} [${label}] ${m.contextWindow ? `(ctx: ${m.contextWindow})` : ""}`,
      );
    }
    if (items.length > 10) {
      runtime.log(`  ... and ${items.length - 10} more`);
    }
  }

  runtime.log(`
\u001b[33mAUTH NOTE:\u001b[0m If you see "No available auth profile" or refresh errors in logs:
1. Re-authenticate: \u001b[1mopenclaw auth login <provider>\u001b[0m
2. Check your API keys in \u001b[1m~/.openclaw/openclaw.json\u001b[0m or environment variables.
3. For OpenAI Codex, ensure you have a valid ChatGPT Plus session token.`);
}
