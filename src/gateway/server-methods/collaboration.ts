import type { GatewayRequestHandlers } from "./types.js";
import { getAllDelegations } from "../../agents/delegation-registry.js";
import { listAllSubagentRuns } from "../../agents/subagent-registry.js";
import { callGateway } from "../call.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { broadcastHierarchyFullRefresh } from "../server-hierarchy-events.js";

/**
 * COLLABORATION SYSTEM
 *
 * Enables true multi-agent teamwork:
 * - Shared sessions where multiple agents collaborate
 * - Agent-to-agent messaging
 * - Collective decision making
 * - Consensus tracking
 */

export type CollaborativeSession = {
  sessionKey: string;
  topic: string;
  createdAt: number;
  members: string[]; // agent IDs
  status: "planning" | "debating" | "decided" | "archived";
  decisions: Array<{
    id: string;
    topic: string;
    proposals: Array<{
      from: string; // agent ID
      proposal: string;
      reasoning: string;
      timestamp: number;
    }>;
    consensus?: {
      agreed: string[]; // agents that agreed
      disagreed: string[]; // agents that disagreed
      finalDecision: string;
      decidedAt: number;
      decidedBy?: string; // moderator agent
    };
  }>;
  messages: Array<{
    from: string; // agent ID or "moderator"
    type: "proposal" | "challenge" | "clarification" | "agreement" | "decision";
    content: string;
    referencesDecision?: string; // decision ID
    timestamp: number;
  }>;
  moderator?: string; // CTO or designated lead
};

const collaborativeSessions = new Map<string, CollaborativeSession>();

/**
 * POLL SYSTEM
 *
 * Lightweight yes/no or multi-choice polls for quick decisions.
 */

export type PollRecord = {
  id: string;
  question: string;
  options: string[];
  voters: string[];
  votes: Record<string, string>;
  createdAt: number;
  timeoutAt?: number;
  initiatorId: string;
  completed: boolean;
};

const polls = new Map<string, PollRecord>();

/**
 * REVIEW REQUEST SYSTEM
 *
 * Async review requests where an agent submits work for review.
 */

export type ReviewRequest = {
  id: string;
  artifact: string;
  reviewers: string[];
  submitterId: string;
  context?: string;
  reviews: Array<{
    reviewerId: string;
    approved: boolean;
    feedback?: string;
    timestamp: number;
  }>;
  createdAt: number;
  completed: boolean;
};

const reviewRequests = new Map<string, ReviewRequest>();

/**
 * Initialize a collaborative session where multiple agents can debate
 *
 * Example: OAuth2 design with Backend, Frontend, Security
 */
export function initializeCollaborativeSession(params: {
  topic: string;
  agents: string[];
  moderator?: string;
  sessionKey?: string;
}): CollaborativeSession {
  const sessionKey = params.sessionKey || `collab:${params.topic}:${Date.now()}`;

  const session: CollaborativeSession = {
    sessionKey,
    topic: params.topic,
    createdAt: Date.now(),
    members: params.agents,
    status: "planning",
    decisions: [],
    messages: [],
    moderator: params.moderator,
  };

  collaborativeSessions.set(sessionKey, session);
  return session;
}

/**
 * Agent publishes a proposal to the collaborative session
 */
export function publishProposal(params: {
  sessionKey: string;
  agentId: string;
  decisionTopic: string;
  proposal: string;
  reasoning: string;
}): { decisionId: string; sessionKey: string } {
  const session = collaborativeSessions.get(params.sessionKey);
  if (!session) {
    throw new Error(`Collaborative session not found: ${params.sessionKey}`);
  }

  if (!session.members.includes(params.agentId)) {
    throw new Error(`Agent ${params.agentId} not a member of this session`);
  }

  let decision = session.decisions.find((d) => d.topic === params.decisionTopic);
  if (!decision) {
    decision = {
      id: `decision:${params.decisionTopic}:${Date.now()}`,
      topic: params.decisionTopic,
      proposals: [],
    };
    session.decisions.push(decision);
  }

  decision.proposals.push({
    from: params.agentId,
    proposal: params.proposal,
    reasoning: params.reasoning,
    timestamp: Date.now(),
  });

  session.messages.push({
    from: params.agentId,
    type: "proposal",
    content: `Proposal: ${params.proposal}. Reasoning: ${params.reasoning}`,
    referencesDecision: decision.id,
    timestamp: Date.now(),
  });

  return {
    decisionId: decision.id,
    sessionKey: params.sessionKey,
  };
}

/**
 * Agent challenges or questions a proposal
 */
export function challengeProposal(params: {
  sessionKey: string;
  decisionId: string;
  agentId: string;
  challenge: string;
  suggestedAlternative?: string;
}): void {
  const session = collaborativeSessions.get(params.sessionKey);
  if (!session) {
    throw new Error(`Collaborative session not found: ${params.sessionKey}`);
  }

  session.messages.push({
    from: params.agentId,
    type: "challenge",
    content:
      params.challenge +
      (params.suggestedAlternative ? ` Alternative: ${params.suggestedAlternative}` : ""),
    referencesDecision: params.decisionId,
    timestamp: Date.now(),
  });
}

/**
 * Agent agrees to a proposal
 */
export function agreeToProposal(params: {
  sessionKey: string;
  decisionId: string;
  agentId: string;
}): void {
  const session = collaborativeSessions.get(params.sessionKey);
  if (!session) {
    throw new Error(`Collaborative session not found: ${params.sessionKey}`);
  }

  const decision = session.decisions.find((d) => d.id === params.decisionId);
  if (!decision) {
    throw new Error(`Decision not found: ${params.decisionId}`);
  }

  if (!decision.consensus) {
    decision.consensus = {
      agreed: [params.agentId],
      disagreed: [],
      finalDecision: "",
      decidedAt: 0,
    };
  } else if (!decision.consensus.agreed.includes(params.agentId)) {
    decision.consensus.agreed.push(params.agentId);
    const disagreedIdx = decision.consensus.disagreed.indexOf(params.agentId);
    if (disagreedIdx >= 0) {
      decision.consensus.disagreed.splice(disagreedIdx, 1);
    }
  }

  session.messages.push({
    from: params.agentId,
    type: "agreement",
    content: `Agrees with decision`,
    referencesDecision: params.decisionId,
    timestamp: Date.now(),
  });
}

/**
 * Moderator finalizes a decision after consensus
 */
export function finalizeDecision(params: {
  sessionKey: string;
  decisionId: string;
  finalDecision: string;
  moderatorId: string;
}): void {
  const session = collaborativeSessions.get(params.sessionKey);
  if (!session) {
    throw new Error(`Collaborative session not found: ${params.sessionKey}`);
  }

  const decision = session.decisions.find((d) => d.id === params.decisionId);
  if (!decision) {
    throw new Error(`Decision not found: ${params.decisionId}`);
  }

  decision.consensus = {
    agreed: session.members,
    disagreed: [],
    finalDecision: params.finalDecision,
    decidedAt: Date.now(),
    decidedBy: params.moderatorId,
  };

  session.messages.push({
    from: params.moderatorId,
    type: "decision",
    content: `DECISION: ${params.finalDecision}`,
    referencesDecision: params.decisionId,
    timestamp: Date.now(),
  });
}

/**
 * Get full collaboration session context
 */
export function getCollaborationContext(sessionKey: string): CollaborativeSession | null {
  return collaborativeSessions.get(sessionKey) || null;
}

/**
 * Return all active collaboration sessions (for hierarchy visualization)
 */
export function getAllCollaborativeSessions(): CollaborativeSession[] {
  return [...collaborativeSessions.values()];
}

/**
 * Get all messages in a decision thread (for an agent to read)
 */
export function getDecisionThread(params: { sessionKey: string; decisionId: string }): Array<{
  from: string;
  type: string;
  content: string;
  timestamp: number;
}> {
  const session = collaborativeSessions.get(params.sessionKey);
  if (!session) {
    return [];
  }

  return session.messages.filter((msg) => msg.referencesDecision === params.decisionId);
}

/**
 * Agent-to-agent direct messaging (simpler than sessions)
 */
export function sendAgentMessage(params: {
  fromAgentId: string;
  toAgentId: string;
  topic: string;
  message: string;
  timestamp?: number;
}): string {
  const messageId = `msg:${params.fromAgentId}:${params.toAgentId}:${Date.now()}`;

  // In a full impl, this would be persisted somewhere that the target agent can read
  // For now, return the messageId as acknowledgement

  return messageId;
}

/**
 * Create a poll and notify voters
 */
export async function createPoll(params: {
  question: string;
  options: string[];
  voters: string[];
  timeoutSeconds?: number;
  initiatorId: string;
}): Promise<{ id: string; result?: string; votes: Record<string, string>; unanimous: boolean }> {
  const pollId = `poll:${Date.now()}`;
  const timeoutAt =
    typeof params.timeoutSeconds === "number" && params.timeoutSeconds > 0
      ? Date.now() + params.timeoutSeconds * 1000
      : undefined;

  const poll: PollRecord = {
    id: pollId,
    question: params.question,
    options: params.options,
    voters: params.voters,
    votes: {},
    createdAt: Date.now(),
    timeoutAt,
    initiatorId: params.initiatorId,
    completed: false,
  };

  polls.set(pollId, poll);

  // Notify voters via sessions_send
  const optionsText = params.options.map((opt, idx) => `${idx + 1}. ${opt}`).join("\n");
  const message = `Poll from ${params.initiatorId}:\n${params.question}\n\nOptions:\n${optionsText}\n\nReply with the number of your choice.`;

  for (const voterId of params.voters) {
    try {
      await callGateway({
        method: "sessions.send",
        params: {
          target: voterId,
          message,
        },
        timeoutMs: 10_000,
      });
    } catch {
      // Non-critical: voter will miss the poll
    }
  }

  // Wait for all votes or timeout
  const waitUntil = timeoutAt ?? Date.now() + 60_000; // Default 60s timeout
  while (Date.now() < waitUntil && Object.keys(poll.votes).length < params.voters.length) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  poll.completed = true;

  // Determine result
  const voteCounts: Record<string, number> = {};
  for (const vote of Object.values(poll.votes)) {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const winners = Object.keys(voteCounts).filter((opt) => voteCounts[opt] === maxVotes);
  const result = winners.length === 1 ? winners[0] : undefined;
  const unanimous = result !== undefined && maxVotes === params.voters.length;

  return {
    id: pollId,
    result,
    votes: poll.votes,
    unanimous,
  };
}

/**
 * Submit work for review
 */
export function submitReview(params: {
  artifact: string;
  reviewers: string[];
  context?: string;
  submitterId: string;
}): { id: string } {
  const reviewId = `review:${Date.now()}`;

  const request: ReviewRequest = {
    id: reviewId,
    artifact: params.artifact,
    reviewers: params.reviewers,
    submitterId: params.submitterId,
    context: params.context,
    reviews: [],
    createdAt: Date.now(),
    completed: false,
  };

  reviewRequests.set(reviewId, request);

  // Notify reviewers (async, non-blocking)
  const contextText = params.context ? `\nContext: ${params.context}` : "";
  const message = `Review request from ${params.submitterId}:\n${params.artifact}${contextText}\n\nPlease review when you're spawned.`;

  for (const reviewerId of params.reviewers) {
    void callGateway({
      method: "sessions.send",
      params: {
        target: reviewerId,
        message,
      },
      timeoutMs: 10_000,
    }).catch(() => {
      // Non-critical
    });
  }

  return { id: reviewId };
}

/**
 * Generate aggregated standup status of all active agents
 */
export function generateStandup(): {
  agents: Array<{
    agentId: string;
    status: string;
    task?: string;
    progress?: string;
    duration?: number;
  }>;
} {
  const now = Date.now();
  const agentMap = new Map<
    string,
    {
      agentId: string;
      status: string;
      task?: string;
      progress?: string;
      duration?: number;
    }
  >();

  // Gather from subagent runs
  const subagentRuns = listAllSubagentRuns();
  for (const run of subagentRuns) {
    const agentId = run.childSessionKey.split(":")[1] || "unknown";
    const duration = run.endedAt
      ? run.endedAt - run.createdAt
      : run.startedAt
        ? now - run.startedAt
        : undefined;

    const status = run.outcome ? run.outcome.status : run.startedAt ? "in_progress" : "pending";

    agentMap.set(agentId, {
      agentId,
      status,
      task: run.task,
      progress: run.progress?.status,
      duration,
    });
  }

  // Gather from delegation registry
  const delegations = getAllDelegations();
  for (const deleg of delegations) {
    if (deleg.state === "completed" || deleg.state === "rejected") {
      continue;
    }

    const agentId = deleg.toAgentId;
    const existing = agentMap.get(agentId);
    if (existing) {
      continue; // Subagent data takes precedence
    }

    const duration = deleg.startedAt ? now - deleg.startedAt : undefined;

    agentMap.set(agentId, {
      agentId,
      status: deleg.state,
      task: deleg.task,
      duration,
    });
  }

  return {
    agents: Array.from(agentMap.values()),
  };
}

/**
 * Export RPC handlers for the gateway
 */
export const collaborationHandlers: GatewayRequestHandlers = {
  "collab.session.init": ({ params, respond }) => {
    try {
      const p = params as {
        topic: string;
        agents: string[];
        moderator?: string;
      };

      if (!p.topic || !Array.isArray(p.agents) || p.agents.length < 2) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "topic and at least 2 agents required"),
        );
        return;
      }

      const session = initializeCollaborativeSession(p);
      broadcastHierarchyFullRefresh();
      respond(true, session, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.proposal.publish": ({ params, respond }) => {
    try {
      const p = params as {
        sessionKey: string;
        agentId: string;
        decisionTopic: string;
        proposal: string;
        reasoning: string;
      };

      const result = publishProposal(p);
      broadcastHierarchyFullRefresh();
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.proposal.challenge": ({ params, respond }) => {
    try {
      const p = params as {
        sessionKey: string;
        decisionId: string;
        agentId: string;
        challenge: string;
        suggestedAlternative?: string;
      };

      challengeProposal(p);
      broadcastHierarchyFullRefresh();
      respond(true, { ok: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.proposal.agree": ({ params, respond }) => {
    try {
      const p = params as {
        sessionKey: string;
        decisionId: string;
        agentId: string;
      };

      agreeToProposal(p);
      broadcastHierarchyFullRefresh();
      respond(true, { ok: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.decision.finalize": ({ params, respond }) => {
    try {
      const p = params as {
        sessionKey: string;
        decisionId: string;
        finalDecision: string;
        moderatorId: string;
      };

      finalizeDecision(p);
      broadcastHierarchyFullRefresh();
      respond(true, { ok: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.session.get": ({ params, respond }) => {
    try {
      const p = params as { sessionKey: string };
      const session = getCollaborationContext(p.sessionKey);

      if (!session) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Session not found"));
        return;
      }

      respond(true, session, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "collab.thread.get": ({ params, respond }) => {
    try {
      const p = params as {
        sessionKey: string;
        decisionId: string;
      };

      const thread = getDecisionThread(p);
      respond(true, { thread }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
