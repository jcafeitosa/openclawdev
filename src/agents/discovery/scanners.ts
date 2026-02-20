import type { DiscoveredModel, ModelScanner } from "./types.js";

export const OpenAIScanner: ModelScanner = {
  providerId: "openai",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string; created: number }> };

      return data.data.map((m) => {
        const isExp = m.id.includes("preview");
        return {
          id: m.id,
          provider: "openai",
          canonicalId: m.id,
          family: m.id.split("-")[0],
          releaseDate: new Date(m.created * 1000).toISOString(),
          tags: isExp ? ["experimental"] : [],
          capabilities: {
            vision: m.id.includes("gpt-4") || m.id.includes("vision"),
            reasoning: m.id.startsWith("o1") || m.id.startsWith("o3"),
          },
        };
      });
    } catch {
      return [];
    }
  },
};

export const AnthropicScanner: ModelScanner = {
  providerId: "anthropic",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as {
        data: Array<{ id: string; display_name: string; created_at?: string }>;
      };

      return data.data.map((m) => ({
        id: m.id,
        provider: "anthropic",
        canonicalId: m.id,
        family: m.id.split("-")[0],
        name: m.display_name,
        releaseDate: m.created_at,
        capabilities: {
          vision: true,
          functionCalling: true,
        },
      }));
    } catch {
      return [];
    }
  },
};

export const GoogleScanner: ModelScanner = {
  providerId: "google",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as {
        models: Array<{
          name: string;
          displayName: string;
          inputTokenLimit: number;
          outputTokenLimit: number;
          supportedGenerationMethods: string[];
        }>;
      };

      return data.models.map((m) => {
        const id = m.name.replace("models/", "");
        const isExp = id.includes("exp") || id.includes("experimental") || id.includes("beta");
        const isFreeTier = id.includes("flash") || id.includes("8b") || isExp;
        const tags = [];
        if (isFreeTier) {
          tags.push("free-tier");
        }
        if (isFreeTier && isExp) {
          tags.push("emergency-free");
        }
        if (isExp) {
          tags.push("experimental");
        }

        return {
          id,
          provider: "google",
          canonicalId: id,
          family: id.split("-")[0],
          name: m.displayName,
          contextWindow: m.inputTokenLimit,
          maxOutput: m.outputTokenLimit,
          isFree: isFreeTier, // Gemini Flash/Exp are usually free on AI Studio
          tags,
          capabilities: {
            vision: m.supportedGenerationMethods.includes("generateContent"),
            reasoning: id.includes("thinking") || id.includes("thought"),
          },
        };
      });
    } catch {
      return [];
    }
  },
};

export const GroqScanner: ModelScanner = {
  providerId: "groq",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => {
        const isCheap =
          m.id.includes("8b") || m.id.includes("versatile") || m.id.includes("instant");
        return {
          id: m.id,
          provider: "groq",
          canonicalId: m.id,
          family: m.id.split("-")[0],
          isFree: false, // Groq is paid but has a free tier for some users/models
          tags: isCheap ? ["fast-cheap"] : [],
          capabilities: {
            vision: false,
            reasoning: m.id.includes("r1"),
          },
        };
      });
    } catch {
      return [];
    }
  },
};

export const XAIScanner: ModelScanner = {
  providerId: "xai",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.x.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => ({
        id: m.id,
        provider: "xai",
        canonicalId: m.id,
        family: m.id.split("-")[0],
      }));
    } catch {
      return [];
    }
  },
};

export const MistralScanner: ModelScanner = {
  providerId: "mistral",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => {
        const isFreeTier =
          m.id.includes("pixtral") || m.id.includes("mistral-small") || m.id.includes("ministral");
        return {
          id: m.id,
          provider: "mistral",
          canonicalId: m.id,
          family: m.id.split("-")[0],
          isFree: isFreeTier, // Mistral has free tier for some models on La Plateforme
          tags: isFreeTier ? ["emergency-free", "free-tier"] : [],
        };
      });
    } catch {
      return [];
    }
  },
};

export const SambanovaScanner: ModelScanner = {
  providerId: "sambanova",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.sambanova.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => ({
        id: m.id,
        provider: "sambanova",
        canonicalId: m.id,
        family: m.id.split("-")[0],
        capabilities: {
          reasoning: m.id.includes("r1"),
        },
      }));
    } catch {
      return [];
    }
  },
};

export const CerebrasScanner: ModelScanner = {
  providerId: "cerebras",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.cerebras.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => ({
        id: m.id,
        provider: "cerebras",
        canonicalId: m.id,
        family: m.id.split("-")[0],
      }));
    } catch {
      return [];
    }
  },
};

export const TogetherScanner: ModelScanner = {
  providerId: "together",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as Array<{ id: string; context_length?: number }>;

      return data.map((m) => ({
        id: m.id,
        provider: "together",
        canonicalId: m.id,
        family: m.id.split("/")[0],
        contextWindow: m.context_length,
        capabilities: {
          vision: m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("llama-3.2"),
        },
      }));
    } catch {
      return [];
    }
  },
};

export const HuggingfaceScanner: ModelScanner = {
  providerId: "huggingface",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      // HF Inference API /v1/models usually lists models available for inference
      const res = await fetch("https://api-inference.huggingface.co/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as Array<{ id: string }>;

      return data.map((m) => ({
        id: m.id,
        provider: "huggingface",
        canonicalId: m.id,
        isFree: true, // HF Inference API has a generous free tier for many models
        tags: ["free-tier"],
      }));
    } catch {
      return [];
    }
  },
};

export const DeepSeekScanner: ModelScanner = {
  providerId: "deepseek",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.deepseek.com/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => ({
        id: m.id,
        provider: "deepseek",
        canonicalId: m.id,
        family: m.id.split("-")[0],
        capabilities: {
          reasoning: m.id.includes("reasoner") || m.id.includes("r1"),
        },
      }));
    } catch {
      return [];
    }
  },
};

export const MinimaxScanner: ModelScanner = {
  providerId: "minimax",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      // Minimax often uses the Anthropic-compatible endpoint if configured.
      // But for discovery, we might need their native models list if available.
      // Many of these providers don't have a public /models endpoint that is easy to find.
      // We will implement a mock-discovery for those with known free models if needed,
      // but let's try standard OpenAI-compatible /models first.
      const res = await fetch("https://api.minimax.io/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "minimax",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const MoonshotScanner: ModelScanner = {
  providerId: "moonshot",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.moonshot.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "moonshot",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const QwenScanner: ModelScanner = {
  providerId: "qwen-portal",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://portal.qwen.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "qwen-portal",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const ZaiScanner: ModelScanner = {
  providerId: "zai",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.z.ai/api/paas/v4/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "zai",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const XiaomiScanner: ModelScanner = {
  providerId: "xiaomi",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.xiaomimimo.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "xiaomi",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const OpenCodeScanner: ModelScanner = {
  providerId: "opencode",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.opencode.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "opencode",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const KimiCodingScanner: ModelScanner = {
  providerId: "kimi-coding",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.moonshot.ai/v1/models", {
        // Often shares moonshot infra
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "kimi-coding",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const SyntheticScanner: ModelScanner = {
  providerId: "synthetic",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.synthetic.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };
      return data.data.map((m) => ({
        id: m.id,
        provider: "synthetic",
        canonicalId: m.id,
      }));
    } catch {
      return [];
    }
  },
};

export const OllamaScanner: ModelScanner = {
  providerId: "ollama",
  async scan(_apiKey: string): Promise<DiscoveredModel[]> {
    try {
      // Ollama usually runs on 11434.
      // We'll try to discover from the default local address if possible.
      // But discovery usually happens on the machine where OpenClaw is running.
      const res = await fetch("http://localhost:11434/api/tags");
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { models: Array<{ name: string }> };
      return data.models.map((m) => ({
        id: m.name,
        provider: "ollama",
        canonicalId: m.name,
        isFree: true, // Local models are "free" (at least in terms of API cost)
        tags: ["local", "emergency-free"],
      }));
    } catch {
      return [];
    }
  },
};

export const VeniceScanner: ModelScanner = {
  providerId: "venice",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://api.venice.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { data: Array<{ id: string }> };

      return data.data.map((m) => ({
        id: m.id,
        provider: "venice",
        canonicalId: m.id,
        family: m.id.split("-")[0],
      }));
    } catch {
      return [];
    }
  },
};

export const BedrockScanner: ModelScanner = {
  providerId: "amazon-bedrock",
  async scan(_apiKey: string): Promise<DiscoveredModel[]> {
    try {
      // Bedrock uses AWS SDK auth (sigv4), not a simple API key.
      // Discovery requires the AWS SDK which may not be available at runtime.
      // Return empty — Bedrock models are statically known via pi-ai registry.
      return [];
    } catch {
      return [];
    }
  },
};

export const OpenRouterScanner: ModelScanner = {
  providerId: "openrouter",
  async scan(apiKey: string): Promise<DiscoveredModel[]> {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as {
        data: Array<{
          id: string;
          name: string;
          context_length: number;
          pricing: { prompt: string; completion: string };
        }>;
      };

      return data.data.map((m) => {
        // OpenRouter IDs are usually "provider/model-id"
        const parts = m.id.split("/");
        let modelPart = parts.length > 1 ? parts.slice(1).join("/") : m.id;

        // Strip :free suffix for canonical identification AND for the model ID itself
        // PI library's ModelRegistry needs the ID without the suffix to match its expectations.
        const hasFreeSuffix = modelPart.endsWith(":free");
        const canonicalId = hasFreeSuffix ? modelPart.slice(0, -5) : modelPart;

        const inputPrice = parseFloat(m.pricing.prompt);
        const outputPrice = parseFloat(m.pricing.completion);
        const isFree = hasFreeSuffix || (inputPrice === 0 && outputPrice === 0);

        return {
          id: canonicalId, // Use stripped ID
          provider: "openrouter",
          canonicalId,
          family: canonicalId.split("-")[0],
          name: m.name,
          displayName:
            hasFreeSuffix && !m.name.toLowerCase().includes("free") ? `${m.name} (free)` : m.name,
          contextWindow: m.context_length,
          isFree,
          tags: isFree ? ["emergency-free"] : [],
          pricing: {
            input: inputPrice * 1000000,
            output: outputPrice * 1000000,
          },
          capabilities: {
            vision: m.id.includes("vision") || m.id.includes("claude-3"),
            reasoning: m.id.includes("r1") || m.id.includes("o1"),
          },
        };
      });
    } catch {
      return [];
    }
  },
};
