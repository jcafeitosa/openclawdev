/**
 * 📊 Chat Type Definitions
 *
 * Complete TypeScript interfaces for Pro Max Chat components
 */

/**
 * Message object representing a single chat message
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    tokens?: number;
    model?: string;
  };
}

/**
 * Streaming token for optimized rendering
 */
export interface StreamToken {
  id: string;
  text: string;
  timestamp: number;
  index: number;
}

/**
 * Streaming configuration
 */
export interface StreamConfig {
  batchSize?: number;
  maxBufferSize?: number;
  debounceMs?: number;
  enableMetrics?: boolean;
}

/**
 * Performance metrics for streaming
 */
export interface StreamMetrics {
  tokensReceived: number;
  tokensRendered: number;
  averageLatency: number;
  p99Latency: number;
  frameDrops: number;
}

/**
 * Chat conversation
 */
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
  };
}

/**
 * Theme configuration
 */
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Chat container props
 */
export interface ChatContainerProps {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  onMessageReceived?: (message: ChatMessage) => void;
  enableMetrics?: boolean;
  enableStreaming?: boolean;
  className?: string;
  theme?: ThemeConfig;
}

/**
 * Glass effect styling variants
 */
export type GlassVariant = "light" | "medium" | "heavy" | "input";

export interface GlassProps {
  variant?: GlassVariant;
  hover?: "lift" | "glow" | "scale" | "none";
  shadow?: "sm" | "md" | "lg" | "xl";
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  respectReducedMotion?: boolean;
}

/**
 * Markdown rendering options
 */
export interface MarkdownOptions {
  enableSyntaxHighlight?: boolean;
  enableEmojis?: boolean;
  enableLaTeX?: boolean;
  enableMermaid?: boolean;
  linkTarget?: "_blank" | "_self";
}
