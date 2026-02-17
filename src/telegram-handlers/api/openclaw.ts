/**
 * OpenClaw API integration layer
 * Interfaces with OpenClaw gateway for real functionality via callGateway RPC.
 */

import { callGateway } from "../../gateway/call.js";
import type { SessionInfo } from "../types";

/**
 * Spawn a subagent via sessions.spawn gateway method.
 */
export async function spawnAgent(
  agentId: string,
  task: string,
  options?: {
    label?: string;
    model?: string;
    thinking?: string;
    runTimeoutSeconds?: number;
  },
): Promise<{ sessionKey: string; message: string }> {
  const result = await callGateway<{ sessionKey: string; message?: string }>({
    method: "sessions.spawn",
    params: {
      agentId,
      task,
      label: options?.label,
      model: options?.model,
      thinking: options?.thinking,
      runTimeoutSeconds: options?.runTimeoutSeconds,
    },
    timeoutMs: 30_000,
  });

  return {
    sessionKey: result.sessionKey,
    message: result.message ?? `Agent ${agentId} spawned successfully`,
  };
}

/**
 * Ask an agent a question via sessions.send gateway method.
 */
export async function askAgent(
  agentId: string,
  message: string,
  options?: {
    timeoutSeconds?: number;
  },
): Promise<{ response: string }> {
  const timeoutMs = (options?.timeoutSeconds ?? 60) * 1000;

  const result = await callGateway<{ response?: string; text?: string }>({
    method: "sessions.send",
    params: { agentId, message },
    timeoutMs,
  });

  return { response: result.response ?? result.text ?? "" };
}

/**
 * Get active sessions via sessions.list gateway method.
 */
export async function getSessions(options?: {
  activeMinutes?: number;
  kinds?: string[];
  limit?: number;
}): Promise<SessionInfo[]> {
  const result = await callGateway<{ sessions: SessionInfo[] }>({
    method: "sessions.list",
    params: {
      activeMinutes: options?.activeMinutes ?? 60,
      kinds: options?.kinds,
      limit: options?.limit ?? 50,
    },
    timeoutMs: 10_000,
  });

  return result.sessions ?? [];
}

/**
 * Get session progress via sessions.progress gateway method.
 */
export async function getSessionProgress(sessionKey: string): Promise<{
  sessionKey: string;
  status: string;
  progress?: string;
  eta?: number;
}> {
  const result = await callGateway<{
    sessionKey: string;
    status: string;
    progress?: string;
    eta?: number;
  }>({
    method: "sessions.progress",
    params: { key: sessionKey },
    timeoutMs: 10_000,
  });

  return {
    sessionKey: result.sessionKey ?? sessionKey,
    status: result.status ?? "unknown",
    progress: result.progress,
    eta: result.eta,
  };
}

/**
 * Abort a running session via sessions.abort gateway method.
 */
export async function abortSession(sessionKey: string): Promise<{ success: boolean }> {
  const result = await callGateway<{ success?: boolean }>({
    method: "sessions.abort",
    params: { key: sessionKey },
    timeoutMs: 10_000,
  });

  return { success: result.success ?? true };
}

/**
 * Get system status via system.status gateway method.
 */
export async function getSystemStatus(): Promise<{
  gateway: string;
  agents: number;
  sessions: number;
  health: string;
}> {
  try {
    const result = await callGateway<{
      gateway?: string;
      agents?: number;
      sessions?: number;
      health?: string;
    }>({
      method: "system.status",
      timeoutMs: 5_000,
    });

    return {
      gateway: result.gateway ?? "online",
      agents: result.agents ?? 0,
      sessions: result.sessions ?? 0,
      health: result.health ?? "ok",
    };
  } catch {
    return { gateway: "unreachable", agents: 0, sessions: 0, health: "error" };
  }
}

/**
 * Search memory via memory.search gateway method.
 */
export async function searchMemory(
  query: string,
  options?: {
    maxResults?: number;
    minScore?: number;
  },
): Promise<Array<{ path: string; lines: string; score: number }>> {
  const result = await callGateway<{
    results: Array<{ path: string; lines: string; score: number }>;
  }>({
    method: "memory.search",
    params: {
      query,
      maxResults: options?.maxResults ?? 10,
      minScore: options?.minScore ?? 0.5,
    },
    timeoutMs: 15_000,
  });

  return result.results ?? [];
}

/**
 * Restart gateway via gateway.restart method.
 */
export async function restartGateway(reason?: string): Promise<{ success: boolean }> {
  const result = await callGateway<{ success?: boolean }>({
    method: "gateway.restart",
    params: { reason },
    timeoutMs: 15_000,
  });

  return { success: result.success ?? true };
}

/**
 * Create config backup via config.backup method.
 */
export async function createBackup(): Promise<{ path: string }> {
  const result = await callGateway<{ path: string }>({
    method: "config.backup",
    timeoutMs: 30_000,
  });

  return { path: result.path };
}
