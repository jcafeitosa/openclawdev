/**
 * MCP Client.
 *
 * Connects to MCP servers via stdio transport and provides
 * methods to list tools and call them.
 *
 * Note: This is a lightweight implementation that communicates
 * over JSON-RPC via stdin/stdout, following the MCP specification.
 * If @modelcontextprotocol/sdk is available, it can be used instead.
 */

import type { McpServerConfig, McpToolDefinition, McpToolCallResult } from "./types.js";

const INIT_TIMEOUT_MS = 15_000;
const CALL_TIMEOUT_MS = 30_000;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
};

type PendingRequest = {
  resolve: (value: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

// Minimal structural type for the MCP server subprocess.
type McpProcess = {
  stdin: { write: (data: string | Uint8Array) => unknown; end: () => void } | null;
  stdout: ReadableStream<Uint8Array> | null | number;
  exited: Promise<number | null>;
  signalCode: NodeJS.Signals | null;
  kill: (signal?: NodeJS.Signals | number) => void;
};

/**
 * Read lines from a ReadableStream and call onLine for each non-empty line.
 */
async function readLines(
  stream: ReadableStream<Uint8Array> | null | number,
  onLine: (line: string) => void,
): Promise<void> {
  if (!(stream instanceof ReadableStream)) {
    return;
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        onLine(part);
      }
    }
    if (buffer) {
      onLine(buffer);
    }
  } catch {
    // Stream closed.
  } finally {
    reader.releaseLock();
  }
}

/**
 * MCP client that communicates with a server process via stdio.
 */
export class McpClient {
  private process: McpProcess | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private initialized = false;
  private serverName: string;
  private config: McpServerConfig;

  constructor(serverName: string, config: McpServerConfig) {
    this.serverName = serverName;
    this.config = config;
  }

  /**
   * Start the MCP server process and initialize the connection.
   */
  async connect(): Promise<void> {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) {
        env[k] = v;
      }
    }
    if (this.config.env) {
      for (const [key, value] of Object.entries(this.config.env)) {
        env[key] = value;
      }
    }

    if (!this.config.command) {
      throw new Error(`MCP server ${this.serverName} config missing command`);
    }

    const proc = Bun.spawn([this.config.command, ...(this.config.args ?? [])], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env,
    });

    if (!proc.stdout || !proc.stdin) {
      throw new Error(`Failed to start MCP server ${this.serverName}: no stdio`);
    }

    this.process = proc;

    // Read JSON-RPC responses line by line (fire-and-forget).
    void readLines(proc.stdout, (line) => {
      this.handleLine(line);
    });

    // Handle process exit.
    void proc.exited.then((code) => {
      this.rejectAll(new Error(`MCP server ${this.serverName} exited with code ${code}`));
      this.process = null;
    });

    // Initialize the connection
    await this.initialize();
  }

  /**
   * Send the initialize request.
   */
  private async initialize(): Promise<void> {
    const response = await this.request(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "openclaw",
          version: "1.0.0",
        },
      },
      INIT_TIMEOUT_MS,
    );

    if (response.error) {
      throw new Error(`MCP server ${this.serverName} initialize error: ${response.error.message}`);
    }

    // Send initialized notification
    this.notify("notifications/initialized", {});
    this.initialized = true;
  }

  /**
   * List available tools from the MCP server.
   */
  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.initialized) {
      throw new Error(`MCP server ${this.serverName} not initialized`);
    }

    const response = await this.request("tools/list", {});
    if (response.error) {
      throw new Error(`MCP server ${this.serverName} tools/list error: ${response.error.message}`);
    }

    const result = response.result as { tools?: unknown[] } | undefined;
    if (!result?.tools || !Array.isArray(result.tools)) {
      return [];
    }

    return result.tools
      .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === "object"))
      .map((t) => ({
        name: typeof t.name === "string" ? t.name : "",
        description: typeof t.description === "string" ? t.description : undefined,
        inputSchema:
          t.inputSchema && typeof t.inputSchema === "object"
            ? (t.inputSchema as Record<string, unknown>)
            : { type: "object", properties: {} },
      }))
      .filter((t) => t.name);
  }

  /**
   * Call a tool on the MCP server.
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    if (!this.initialized) {
      throw new Error(`MCP server ${this.serverName} not initialized`);
    }

    const response = await this.request("tools/call", {
      name: toolName,
      arguments: args,
    });

    if (response.error) {
      return {
        content: [{ type: "text", text: response.error.message }],
        isError: true,
      };
    }

    const result = response.result as { content?: unknown[]; isError?: boolean } | undefined;
    if (!result?.content || !Array.isArray(result.content)) {
      return { content: [{ type: "text", text: "(empty result)" }] };
    }

    const content = result.content
      .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
      .map((c) => {
        if (c.type === "text" && typeof c.text === "string") {
          return { type: "text" as const, text: c.text };
        }
        if (c.type === "image" && typeof c.data === "string" && typeof c.mimeType === "string") {
          return { type: "image" as const, data: c.data, mimeType: c.mimeType };
        }
        return { type: "text" as const, text: JSON.stringify(c) };
      });

    return { content, isError: result.isError === true };
  }

  /**
   * Disconnect and kill the server process.
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    this.rejectAll(new Error("Client disconnected"));

    if (this.process) {
      const proc = this.process;
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
      const killTimer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, 2000);
      try {
        await proc.exited;
      } finally {
        clearTimeout(killTimer);
      }
      this.process = null;
    }
  }

  get isConnected(): boolean {
    return this.initialized && this.process !== null;
  }

  private async request(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = CALL_TIMEOUT_MS,
  ): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.send(request);
    });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.send({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  private send(data: unknown): void {
    if (!this.process?.stdin) {
      return;
    }
    const json = JSON.stringify(data);
    this.process.stdin.write(json + "\n");
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let response: JsonRpcResponse;
    try {
      response = JSON.parse(trimmed) as JsonRpcResponse;
    } catch {
      return;
    }

    if (typeof response.id !== "number") {
      return; // Notification or invalid — ignore
    }

    const pending = this.pending.get(response.id);
    if (pending) {
      this.pending.delete(response.id);
      clearTimeout(pending.timer);
      pending.resolve(response);
    }
  }

  private rejectAll(error: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
