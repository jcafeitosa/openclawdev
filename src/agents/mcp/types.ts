/**
 * MCP (Model Context Protocol) integration types.
 *
 * Defines types for connecting to MCP servers and exposing
 * their tools to the Pi-AI agent runtime.
 */

/**
 * Configuration for a single MCP server.
 */
import { z } from "zod";

export type McpTransportType = "stdio" | "sse" | "http" | "websocket";

export const McpServerConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
  type: z.enum(["stdio", "sse", "http", "websocket"]).optional().default("stdio"),
  disabled: z.boolean().optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

/**
 * MCP configuration file (mcp.json).
 */
export const McpConfigSchema = z.object({
  servers: z.record(z.string(), McpServerConfigSchema),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;

/**
 * Represents an MCP tool definition as received from a server.
 */
export type McpToolDefinition = {
  /** Tool name as reported by the MCP server. */
  name: string;
  /** Tool description. */
  description?: string;
  /** JSON Schema for the tool's input parameters. */
  inputSchema: Record<string, unknown>;
};

/**
 * Result of an MCP tool call.
 */
export type McpToolCallResult = {
  content: Array<
    { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
  >;
  isError?: boolean;
};

/**
 * State of an active MCP server connection.
 */
export type McpServerState = {
  /** Server name from config. */
  name: string;
  /** Available tools from this server. */
  tools: McpToolDefinition[];
  /** Whether the server is connected and ready. */
  connected: boolean;
  /** Last error message, if any. */
  error?: string;
};
