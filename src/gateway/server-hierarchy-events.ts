import {
  resolveAgentConfig,
  resolveAgentRole,
  resolveDefaultAgentId,
} from "../agents/agent-scope.js";
import {
  listAllSubagentRuns,
  type SubagentRunRecord,
  type SubagentUsage,
} from "../agents/subagent-registry.js";
import { loadConfig } from "../config/config.js";
import { onAgentEvent } from "../infra/agent-events.js";
import { parseAgentSessionKey } from "../routing/session-key.js";
import { getAllCollaborativeSessions } from "./server-methods/collaboration.js";

export type HierarchyEventType =
  | "spawn"
  | "start"
  | "end"
  | "error"
  | "usage-update"
  | "full-refresh";

export type HierarchyEvent = {
  type: HierarchyEventType;
  timestamp: number;
  runId?: string;
  sessionKey?: string;
  parentSessionKey?: string;
  label?: string;
  task?: string;
  status?: "running" | "completed" | "error" | "pending";
  outcome?: { status: string; error?: string };
};

export type HierarchyNode = {
  sessionKey: string;
  runId?: string;
  agentId?: string;
  agentRole?: string;
  label?: string;
  task?: string;
  status: "running" | "completed" | "error" | "pending";
  startedAt?: number;
  endedAt?: number;
  children: HierarchyNode[];
  usage?: SubagentUsage;
};

export type CollaborationEdge = {
  source: string; // agentId
  target: string; // agentId
  type: "proposal" | "challenge" | "agreement" | "decision" | "clarification";
  topic?: string;
};

export type HierarchySnapshot = {
  roots: HierarchyNode[];
  collaborationEdges: CollaborationEdge[];
  updatedAt: number;
};

type HierarchyBroadcast = (
  event: string,
  payload: unknown,
  opts?: { dropIfSlow?: boolean },
) => void;

let hierarchyBroadcast: HierarchyBroadcast | null = null;
let listenerStop: (() => void) | null = null;
let lastEventSeq = 0;

function extractAgentIdFromSessionKey(sessionKey: string): string | undefined {
  const parsed = parseAgentSessionKey(sessionKey);
  return parsed?.agentId ?? undefined;
}

function buildHierarchySnapshot(): HierarchySnapshot {
  const runs = listAllSubagentRuns();
  const cfg = loadConfig();
  const childrenByParent = new Map<string, HierarchyNode[]>();
  const nodeBySession = new Map<string, HierarchyNode>();
  const childSessionKeys = new Set<string>();

  // First pass: create nodes for all runs
  for (const run of runs) {
    const status = resolveStatus(run);
    const agentId = extractAgentIdFromSessionKey(run.childSessionKey);
    const agentRole = agentId ? resolveAgentRole(cfg, agentId) : undefined;
    const agentName = agentId ? resolveAgentConfig(cfg, agentId)?.name : undefined;
    const node: HierarchyNode = {
      sessionKey: run.childSessionKey,
      runId: run.runId,
      agentId,
      agentRole,
      label: run.label || agentName || (agentId ? `Agent: ${agentId}` : undefined),
      task: run.task,
      status,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      children: [],
      usage: run.usage,
    };

    nodeBySession.set(run.childSessionKey, node);
    childSessionKeys.add(run.childSessionKey);

    const parentKey = run.requesterSessionKey;
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey)!.push(node);
  }

  // Second pass: link children
  for (const [parentKey, children] of childrenByParent.entries()) {
    const parentNode = nodeBySession.get(parentKey);
    if (parentNode) {
      parentNode.children = children;
    }
  }

  // Find roots: parents that are not themselves children
  const roots: HierarchyNode[] = [];
  const rootSessionKeysUsed = new Set<string>();
  const parentKeys = new Set(childrenByParent.keys());
  for (const parentKey of parentKeys) {
    if (!childSessionKeys.has(parentKey)) {
      const children = childrenByParent.get(parentKey) ?? [];
      if (children.length > 0) {
        const rootAgentId = extractAgentIdFromSessionKey(parentKey);
        const rootRole = rootAgentId ? resolveAgentRole(cfg, rootAgentId) : undefined;
        const rootName = rootAgentId ? resolveAgentConfig(cfg, rootAgentId)?.name : undefined;
        const rootNode: HierarchyNode = {
          sessionKey: parentKey,
          agentId: rootAgentId,
          agentRole: rootRole,
          label: rootName || (rootAgentId ? `Agent: ${rootAgentId}` : "Root Session"),
          status: "running",
          children,
        };
        roots.push(rootNode);
        rootSessionKeysUsed.add(parentKey);
      }
    }
  }

  // Always include the default (orchestrator) agent as a root,
  // even when no subagents have been spawned yet.
  const defaultAgentId = resolveDefaultAgentId(cfg);
  const defaultSessionKey = `agent:${defaultAgentId}:main`;
  if (!rootSessionKeysUsed.has(defaultSessionKey)) {
    const defaultRole = resolveAgentRole(cfg, defaultAgentId);
    const defaultName = resolveAgentConfig(cfg, defaultAgentId)?.name;
    roots.unshift({
      sessionKey: defaultSessionKey,
      agentId: defaultAgentId,
      agentRole: defaultRole,
      label: defaultName || `Agent: ${defaultAgentId}`,
      status: "running",
      children: [],
    });
  }

  // Extract collaboration edges from active sessions
  const collaborationEdges: CollaborationEdge[] = [];
  try {
    const sessions = getAllCollaborativeSessions();
    for (const session of sessions) {
      const members = session.members;
      // Build edges from messages: each message implies interaction with all other members
      for (const msg of session.messages) {
        for (const member of members) {
          if (member !== msg.from) {
            collaborationEdges.push({
              source: msg.from,
              target: member,
              type: msg.type,
              topic: session.topic,
            });
          }
        }
      }
      // Build edges from decision proposals: proposer interacts with all who challenged/agreed
      for (const decision of session.decisions) {
        const proposers = decision.proposals.map((p) => p.from);
        // Each proposer connects to other proposers (they debated)
        for (let i = 0; i < proposers.length; i++) {
          for (let j = i + 1; j < proposers.length; j++) {
            collaborationEdges.push({
              source: proposers[i],
              target: proposers[j],
              type: "proposal",
              topic: decision.topic,
            });
          }
        }
      }
    }
  } catch {
    // Collaboration data is optional — don't break hierarchy if it fails
  }

  return {
    roots,
    collaborationEdges,
    updatedAt: Date.now(),
  };
}

function resolveStatus(run: SubagentRunRecord): HierarchyNode["status"] {
  if (run.outcome) {
    return run.outcome.status === "ok" ? "completed" : "error";
  }
  return run.startedAt ? "running" : "pending";
}

function broadcastHierarchyEvent(event: HierarchyEvent) {
  if (!hierarchyBroadcast) {
    return;
  }
  lastEventSeq++;
  const payload = {
    ...event,
    seq: lastEventSeq,
    snapshot: buildHierarchySnapshot(),
  };
  hierarchyBroadcast("hierarchy", payload, { dropIfSlow: true });
}

export function initHierarchyEventBroadcaster(broadcast: HierarchyBroadcast) {
  hierarchyBroadcast = broadcast;

  if (listenerStop) {
    listenerStop();
    listenerStop = null;
  }

  listenerStop = onAgentEvent((evt) => {
    if (!evt || evt.stream !== "lifecycle") {
      return;
    }

    const phase = evt.data?.phase;
    const runId = evt.runId;

    if (phase === "spawn") {
      const parentSessionKey =
        typeof evt.data?.parentSessionKey === "string" ? evt.data.parentSessionKey : undefined;
      const label = typeof evt.data?.label === "string" ? evt.data.label : undefined;
      const task = typeof evt.data?.task === "string" ? evt.data.task : undefined;
      broadcastHierarchyEvent({
        type: "spawn",
        timestamp: Date.now(),
        runId,
        sessionKey: evt.sessionKey,
        parentSessionKey,
        label,
        task,
        status: "pending",
      });
      return;
    }

    if (phase === "start") {
      broadcastHierarchyEvent({
        type: "start",
        timestamp: Date.now(),
        runId,
        sessionKey: evt.sessionKey,
        status: "running",
      });
      return;
    }

    if (phase === "end") {
      broadcastHierarchyEvent({
        type: "end",
        timestamp: Date.now(),
        runId,
        sessionKey: evt.sessionKey,
        status: "completed",
        outcome: { status: "ok" },
      });
      return;
    }

    if (phase === "error") {
      const errorMsg = typeof evt.data?.error === "string" ? evt.data.error : undefined;
      broadcastHierarchyEvent({
        type: "error",
        timestamp: Date.now(),
        runId,
        sessionKey: evt.sessionKey,
        status: "error",
        outcome: { status: "error", error: errorMsg },
      });
      return;
    }

    if (phase === "usage-update") {
      broadcastHierarchyEvent({
        type: "usage-update",
        timestamp: Date.now(),
        runId,
        sessionKey: evt.sessionKey,
        status: "running",
      });
      return;
    }
  });
}

export function broadcastHierarchySpawn(params: {
  runId: string;
  childSessionKey: string;
  parentSessionKey: string;
  label?: string;
  task: string;
}) {
  broadcastHierarchyEvent({
    type: "spawn",
    timestamp: Date.now(),
    runId: params.runId,
    sessionKey: params.childSessionKey,
    parentSessionKey: params.parentSessionKey,
    label: params.label,
    task: params.task,
    status: "pending",
  });
}

export function broadcastHierarchyFullRefresh() {
  broadcastHierarchyEvent({
    type: "full-refresh",
    timestamp: Date.now(),
  });
}

export function stopHierarchyEventBroadcaster() {
  if (listenerStop) {
    listenerStop();
    listenerStop = null;
  }
  hierarchyBroadcast = null;
}

export function getHierarchySnapshot(): HierarchySnapshot {
  return buildHierarchySnapshot();
}
