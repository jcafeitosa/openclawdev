/**
 * Model pools configuration types.
 * Extended config format for unified model selection.
 */

/**
 * Selection mode for models in a pool.
 */
export type PoolSelectionMode =
  | "ordered" // Use models in order, fallback to next
  | "best-fit" // Auto-select best match by capabilities
  | "agent-choice"; // Agent can choose any model from pool

/**
 * Fallback behavior when a model fails or is unavailable.
 */
export type PoolFallbackBehavior =
  | "next-in-pool" // Try next model in the same pool
  | "next-pool" // Fall back to another pool
  | "error"; // Fail immediately

/**
 * Capability requirement level.
 */
export type CapabilityLevel = "required" | "preferred" | "optional";

/**
 * Model pool configuration.
 */
export type ModelPoolConfig = {
  /** Ordered list of models (provider/model strings) */
  models: string[];
  /** Selection strategy */
  selectionMode?: PoolSelectionMode;
  /** Fallback behavior */
  fallbackBehavior?: PoolFallbackBehavior;
  /** Alternative pool name to fallback to */
  fallbackPool?: string;
  /** Capability requirements */
  capabilities?: {
    vision?: CapabilityLevel;
    tools?: CapabilityLevel;
    reasoning?: CapabilityLevel;
    extendedThinking?: CapabilityLevel;
    streaming?: CapabilityLevel;
    contextWindow?: number;
  };
};

/**
 * Complete model pools configuration.
 */
export type ModelPoolsConfig = {
  /** Default pool for general tasks */
  default: ModelPoolConfig;
  /** Coding/programming tasks */
  coding?: ModelPoolConfig;
  /** Deep reasoning/thinking tasks */
  thinking?: ModelPoolConfig;
  /** Vision/image analysis */
  vision?: ModelPoolConfig;
  /** System operations/tools */
  tools?: ModelPoolConfig;
  /** Custom pools */
  [key: string]: ModelPoolConfig | undefined;
};

/**
 * Complexity to pool mapping.
 */
export type ComplexityPoolMapping = {
  trivial?: {
    pool: string;
    preferIndex?: number;
  };
  moderate?: {
    pool: string;
    preferIndex?: number;
  };
  complex?: {
    pool: string;
    preferIndex?: number;
  };
};
