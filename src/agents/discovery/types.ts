export type DiscoveredModel = {
  id: string;
  provider: string;
  canonicalId?: string; // e.g. "claude-3-5-sonnet" regardless of provider
  family?: string; // e.g. "claude-3", "gpt-4"
  name?: string;
  displayName?: string; // Human-readable name including attributes like (free)
  description?: string;
  contextWindow?: number;
  maxOutput?: number;
  isFree?: boolean; // New field for free model detection
  tags?: string[]; // New field for specialized tagging (e.g. "emergency-free")
  pricing?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
  releaseDate?: string;
  capabilities?: {
    vision?: boolean;
    functionCalling?: boolean;
    reasoning?: boolean;
  };
};

export type ModelScanner = {
  providerId: string;
  scan(apiKey: string): Promise<DiscoveredModel[]>;
};
