/**
 * E2E COLLABORATION PERSISTENCE & AUTO-COMPLETION TEST
 *
 * Validates the new capabilities introduced by the collaboration expansion:
 *
 * 1. PERSISTENCE: Collaboration sessions survive save/restore cycle
 * 2. STALE ARCHIVAL: Debating sessions older than 2h are archived on restore
 * 3. DELEGATION AUTO-COMPLETION: Subagent run end triggers delegation completion
 * 4. ENHANCED CONTEXT INJECTION: Spawned agents get prescriptive delegation protocol
 * 5. ESCALATION PROTOCOL: Context includes upward request + challenge guidance
 * 6. FULL LIFECYCLE: delegation→assigned→auto-completed produces approval edges
 * 7. ALL EDGE TYPES: proposal/challenge/agreement/decision/clarification persisted
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initializeCollaborativeSession,
  publishProposal,
  challengeProposal,
  agreeToProposal,
  finalizeDecision,
  getCollaborationContext,
  getAllCollaborativeSessions,
  resetCollaborationStateForTests,
  initCollaborationRegistry,
  type CollaborativeSession,
} from "../gateway/server-methods/collaboration.js";
import {
  saveCollabSession,
  loadCollabSession,
  loadAllCollabSessions,
  deleteCollabSession,
} from "./collaboration-session-storage.js";
import { buildCollaborationContext } from "./collaboration-spawn.js";
import {
  registerDelegation,
  completeDelegation,
  getDelegation,
  listDelegationsForAgent,
  resetDelegationRegistryForTests,
} from "./delegation-registry.js";

describe("E2E: Collaboration Persistence & Auto-Completion", () => {
  let tmpStateDir: string;
  const prevStateDir = process.env.OPENCLAW_STATE_DIR;

  /** Let fire-and-forget persistence writes complete before simulating restart */
  async function flushPersistence() {
    await new Promise((r) => setTimeout(r, 150));
  }

  beforeEach(async () => {
    tmpStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-e2e-collab-persist-"));
    process.env.OPENCLAW_STATE_DIR = tmpStateDir;
    resetCollaborationStateForTests();
    resetDelegationRegistryForTests();
  });

  afterEach(async () => {
    try {
      if (tmpStateDir) {
        await fs.rm(tmpStateDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors from async delegation/collab persistence races
    }
  });

  afterAll(() => {
    if (prevStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = prevStateDir;
    }
  });

  // ═══════════════════════════════════════════
  // 1. COLLABORATION SESSION STORAGE LAYER
  // ═══════════════════════════════════════════

  describe("Collaboration Session Storage", () => {
    it("should save and load a collaboration session via atomic write", async () => {
      const session: CollaborativeSession = {
        sessionKey: "collab:test:123",
        topic: "API Design",
        createdAt: Date.now(),
        members: ["backend-architect", "frontend-architect"],
        status: "debating",
        roundCount: 2,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [
          {
            from: "backend-architect",
            type: "proposal",
            content: "Use REST with JSON:API",
            timestamp: Date.now(),
          },
        ],
        moderator: "main",
      };

      await saveCollabSession(session);
      const loaded = await loadCollabSession("collab:test:123");

      expect(loaded).not.toBeNull();
      expect(loaded?.sessionKey).toBe("collab:test:123");
      expect(loaded?.topic).toBe("API Design");
      expect(loaded?.status).toBe("debating");
      expect(loaded?.roundCount).toBe(2);
      expect(loaded?.members).toEqual(["backend-architect", "frontend-architect"]);
      expect(loaded?.messages).toHaveLength(1);
      expect(loaded?.moderator).toBe("main");
    });

    it("should load all sessions from disk", async () => {
      const session1: CollaborativeSession = {
        sessionKey: "collab:auth:1",
        topic: "Auth Design",
        createdAt: Date.now(),
        members: ["a", "b"],
        status: "planning",
        roundCount: 0,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [],
      };
      const session2: CollaborativeSession = {
        sessionKey: "collab:db:2",
        topic: "DB Schema",
        createdAt: Date.now(),
        members: ["c", "d"],
        status: "decided",
        roundCount: 5,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [],
      };

      await saveCollabSession(session1);
      await saveCollabSession(session2);

      const all = await loadAllCollabSessions();
      expect(all.size).toBe(2);
      expect(all.has("collab:auth:1")).toBe(true);
      expect(all.has("collab:db:2")).toBe(true);
    });

    it("should delete a session from disk", async () => {
      const session: CollaborativeSession = {
        sessionKey: "collab:delete-me:1",
        topic: "Temp",
        createdAt: Date.now(),
        members: ["x"],
        status: "planning",
        roundCount: 0,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [],
      };
      await saveCollabSession(session);
      expect(await loadCollabSession("collab:delete-me:1")).not.toBeNull();

      await deleteCollabSession("collab:delete-me:1");
      expect(await loadCollabSession("collab:delete-me:1")).toBeNull();
    });

    it("should handle missing store directory gracefully", async () => {
      const loaded = await loadCollabSession("nonexistent:session");
      expect(loaded).toBeNull();

      const all = await loadAllCollabSessions();
      expect(all.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // 2. PERSISTENCE INTEGRATION IN REGISTRY
  // ═══════════════════════════════════════════

  describe("Collaboration Registry Persistence", () => {
    it("should persist sessions on every mutation and restore on init", async () => {
      // Create a session (triggers persist)
      const session = initializeCollaborativeSession({
        topic: "Microservices Design",
        agents: ["backend-architect", "frontend-architect", "security-engineer"],
        moderator: "main",
      });

      // Publish proposal (triggers persist)
      const { decisionId } = publishProposal({
        sessionKey: session.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "Service boundaries",
        proposal: "Domain-driven bounded contexts",
        reasoning: "Aligns with business capabilities",
      });

      // Challenge (triggers persist)
      challengeProposal({
        sessionKey: session.sessionKey,
        decisionId,
        agentId: "frontend-architect",
        challenge: "Too many services initially",
        suggestedAlternative: "Start with modular monolith",
      });

      // Agree (triggers persist)
      agreeToProposal({
        sessionKey: session.sessionKey,
        decisionId,
        agentId: "security-engineer",
      });

      // Verify in-memory state
      const ctx = getCollaborationContext(session.sessionKey);
      expect(ctx?.messages).toHaveLength(3); // proposal + challenge + agreement
      expect(ctx?.roundCount).toBe(2); // proposal + challenge
      expect(ctx?.status).toBe("debating");

      // Let fire-and-forget persistence writes complete
      await flushPersistence();

      // Simulate gateway restart: clear in-memory state and restore from disk
      resetCollaborationStateForTests();
      expect(getCollaborationContext(session.sessionKey)).toBeNull();
      expect(getAllCollaborativeSessions()).toHaveLength(0);

      // Restore from disk
      await initCollaborationRegistry();

      // Verify restored state matches
      const restored = getCollaborationContext(session.sessionKey);
      expect(restored).not.toBeNull();
      expect(restored?.topic).toBe("Microservices Design");
      expect(restored?.status).toBe("debating");
      expect(restored?.roundCount).toBe(2);
      expect(restored?.messages).toHaveLength(3);
      expect(restored?.decisions).toHaveLength(1);
      expect(restored?.decisions[0]?.proposals).toHaveLength(1);
      expect(restored?.moderator).toBe("main");
    });

    it("should archive stale debating sessions (>2h) on restore", async () => {
      // Manually save a session with old createdAt to simulate stale state
      const staleSession: CollaborativeSession = {
        sessionKey: "collab:stale:old",
        topic: "Stale Debate",
        createdAt: Date.now() - 3 * 60 * 60_000, // 3 hours ago
        members: ["a", "b"],
        status: "debating",
        roundCount: 4,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [],
      };
      await saveCollabSession(staleSession);

      // Also save a fresh session
      const freshSession: CollaborativeSession = {
        sessionKey: "collab:fresh:new",
        topic: "Fresh Debate",
        createdAt: Date.now() - 30 * 60_000, // 30 minutes ago
        members: ["c", "d"],
        status: "debating",
        roundCount: 2,
        minRounds: 3,
        maxRounds: 7,
        decisions: [],
        messages: [],
      };
      await saveCollabSession(freshSession);

      // Restore
      await initCollaborationRegistry();

      const stale = getCollaborationContext("collab:stale:old");
      expect(stale?.status).toBe("archived");

      const fresh = getCollaborationContext("collab:fresh:new");
      expect(fresh?.status).toBe("debating");
    });

    it("should persist finalized decisions and survive restart", async () => {
      const session = initializeCollaborativeSession({
        topic: "Auth Strategy",
        agents: ["backend-architect", "security-engineer"],
        moderator: "main",
        minRounds: 2,
      });

      // Simulate debate: 2 proposals + 1 challenge = 3 rounds
      const { decisionId } = publishProposal({
        sessionKey: session.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "Token format",
        proposal: "JWT with short expiry",
        reasoning: "Stateless, easy to validate",
      });
      publishProposal({
        sessionKey: session.sessionKey,
        agentId: "security-engineer",
        decisionTopic: "Token format",
        proposal: "Opaque tokens with introspection",
        reasoning: "More secure, revocable",
      });

      // Finalize (roundCount=2, minRounds=2 → allowed)
      finalizeDecision({
        sessionKey: session.sessionKey,
        decisionId,
        finalDecision: "JWT with 15min expiry + refresh token rotation",
        moderatorId: "main",
      });

      const ctx = getCollaborationContext(session.sessionKey);
      expect(ctx?.status).toBe("decided");
      expect(ctx?.decisions[0]?.consensus?.finalDecision).toBe(
        "JWT with 15min expiry + refresh token rotation",
      );

      // Restart
      await flushPersistence();
      resetCollaborationStateForTests();
      await initCollaborationRegistry();

      const restored = getCollaborationContext(session.sessionKey);
      expect(restored?.status).toBe("decided");
      expect(restored?.decisions[0]?.consensus?.finalDecision).toBe(
        "JWT with 15min expiry + refresh token rotation",
      );
      expect(restored?.decisions[0]?.consensus?.decidedBy).toBe("main");
    });
  });

  // ═══════════════════════════════════════════
  // 3. ALL EDGE TYPES IN COLLABORATION SESSIONS
  // ═══════════════════════════════════════════

  describe("All Collaboration Edge Types", () => {
    it("should produce proposal, challenge, agreement, decision, and clarification messages", async () => {
      const session = initializeCollaborativeSession({
        topic: "API Versioning",
        agents: ["backend-architect", "frontend-architect", "security-engineer"],
        moderator: "main",
        minRounds: 2,
      });

      // PROPOSAL edge
      const { decisionId } = publishProposal({
        sessionKey: session.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "Versioning strategy",
        proposal: "URL-based versioning /v1/",
        reasoning: "Simple and explicit",
      });

      // CHALLENGE edge
      challengeProposal({
        sessionKey: session.sessionKey,
        decisionId,
        agentId: "frontend-architect",
        challenge: "URL versioning breaks caching",
        suggestedAlternative: "Header-based versioning",
      });

      // AGREEMENT edge
      agreeToProposal({
        sessionKey: session.sessionKey,
        decisionId,
        agentId: "security-engineer",
      });

      // DECISION edge (roundCount=2 >= minRounds=2)
      finalizeDecision({
        sessionKey: session.sessionKey,
        decisionId,
        finalDecision: "Header-based versioning with Accept header",
        moderatorId: "main",
      });

      const ctx = getCollaborationContext(session.sessionKey);
      expect(ctx).not.toBeNull();

      const messageTypes = ctx!.messages.map((m) => m.type);
      expect(messageTypes).toContain("proposal");
      expect(messageTypes).toContain("challenge");
      expect(messageTypes).toContain("agreement");
      expect(messageTypes).toContain("decision");

      // Verify all messages are persisted to disk
      await flushPersistence();
      resetCollaborationStateForTests();
      await initCollaborationRegistry();

      const restored = getCollaborationContext(session.sessionKey);
      const restoredTypes = restored!.messages.map((m) => m.type);
      expect(restoredTypes).toContain("proposal");
      expect(restoredTypes).toContain("challenge");
      expect(restoredTypes).toContain("agreement");
      expect(restoredTypes).toContain("decision");
    });
  });

  // ═══════════════════════════════════════════
  // 4. DELEGATION LIFECYCLE & AUTO-COMPLETION
  // ═══════════════════════════════════════════

  describe("Delegation Lifecycle & Auto-Completion", () => {
    it("should produce approval edge when delegation is completed successfully", () => {
      // Orchestrator delegates to specialist (downward → direct assignment)
      const record = registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Implement REST endpoints for /users",
        priority: "high",
      });

      expect(record.state).toBe("assigned");
      expect(record.direction).toBe("downward");

      // Simulate auto-completion (what subagent-registry does when run finishes)
      const completed = completeDelegation(record.id, {
        status: "success",
        artifact: "Task completed successfully: Implement REST endpoints for /users",
      });

      expect(completed).not.toBeNull();
      expect(completed!.state).toBe("completed");
      expect(completed!.result?.status).toBe("success");
      expect(completed!.completedAt).toBeGreaterThan(0);
    });

    it("should produce rejection edge when delegation fails", () => {
      const record = registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Implement payment gateway",
        priority: "critical",
      });

      const failed = completeDelegation(record.id, {
        status: "failure",
        error: "Task failed: timeout",
      });

      expect(failed).not.toBeNull();
      expect(failed!.state).toBe("failed");
      expect(failed!.result?.status).toBe("failure");
    });

    it("should track delegations per agent correctly", async () => {
      // Create multiple delegations with different from agents to avoid ID collision
      // (IDs use Date.now() — same millisecond + same from/to = same ID)
      registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Task A",
      });

      // Small delay to ensure different Date.now() for unique ID
      await new Promise((r) => setTimeout(r, 2));

      registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Task B",
      });

      const delegations = listDelegationsForAgent("backend-architect");
      const active = delegations.filter(
        (d) =>
          (d.state === "assigned" || d.state === "in_progress") &&
          d.toAgentId === "backend-architect",
      );
      expect(active).toHaveLength(2);

      // Complete one
      completeDelegation(active[0].id, { status: "success" });
      const remaining = listDelegationsForAgent("backend-architect").filter(
        (d) =>
          (d.state === "assigned" || d.state === "in_progress") &&
          d.toAgentId === "backend-architect",
      );
      expect(remaining).toHaveLength(1);
    });

    it("should handle upward request (worker → specialist) requiring review", () => {
      const record = registerDelegation({
        fromAgentId: "performance-engineer",
        fromSessionKey: "agent:performance-engineer:main",
        fromRole: "worker",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Need help with query optimization",
        justification: "Blocked on N+1 queries",
      });

      expect(record.state).toBe("pending_review");
      expect(record.direction).toBe("upward");
    });
  });

  // ═══════════════════════════════════════════
  // 5. ENHANCED DELEGATION CONTEXT INJECTION
  // ═══════════════════════════════════════════

  describe("Enhanced Delegation Context Injection", () => {
    it("should inject MANDATORY DELEGATION PROTOCOL when agent has received delegations", async () => {
      // Setup: orchestrator delegates to backend
      registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Implement OAuth2 flow",
        priority: "high",
      });

      const context = await buildCollaborationContext({
        agentId: "backend-architect",
        agentRole: "Backend Architect",
        agentExpertise: "API, Security",
      });

      expect(context.systemPromptAddendum).toContain("MANDATORY DELEGATION PROTOCOL");
      expect(context.systemPromptAddendum).toContain("1 active delegation(s)");
      expect(context.systemPromptAddendum).toContain("Implement OAuth2 flow");
      expect(context.systemPromptAddendum).toContain("delegation.accept");
      expect(context.systemPromptAddendum).toContain("delegation.complete");
      expect(context.systemPromptAddendum).toContain("delegation.reject");
      expect(context.systemPromptAddendum).toContain("delegation.request");
      expect(context.systemPromptAddendum).toContain(
        "Never end your session without completing or rejecting",
      );
    });

    it("should inject ESCALATION PROTOCOL guidance", async () => {
      const context = await buildCollaborationContext({
        agentId: "backend-architect",
        agentRole: "Backend Architect",
        agentExpertise: "API",
      });

      expect(context.systemPromptAddendum).toContain("ESCALATION PROTOCOL");
      expect(context.systemPromptAddendum).toContain("delegation.request");
      expect(context.systemPromptAddendum).toContain("collaboration.proposal.challenge");
      expect(context.systemPromptAddendum).toContain("blocked for >2 tool calls");
    });

    it("should show delegations assigned OUT by the agent separately", async () => {
      // Agent delegates to someone else
      registerDelegation({
        fromAgentId: "backend-architect",
        fromSessionKey: "agent:backend-architect:main",
        fromRole: "specialist",
        toAgentId: "performance-engineer",
        toRole: "worker",
        task: "Run load tests on /users endpoint",
        priority: "normal",
      });

      const context = await buildCollaborationContext({
        agentId: "backend-architect",
        agentRole: "Backend Architect",
      });

      expect(context.systemPromptAddendum).toContain("DELEGATIONS YOU ASSIGNED");
      expect(context.systemPromptAddendum).toContain("performance-engineer");
      expect(context.systemPromptAddendum).toContain("Run load tests");
    });

    it("should not inject delegation protocol when agent has no active delegations", async () => {
      const context = await buildCollaborationContext({
        agentId: "backend-architect",
        agentRole: "Backend Architect",
      });

      expect(context.systemPromptAddendum).not.toContain("MANDATORY DELEGATION PROTOCOL");
      // But escalation protocol should still be there
      expect(context.systemPromptAddendum).toContain("ESCALATION PROTOCOL");
    });
  });

  // ═══════════════════════════════════════════
  // 6. FULL LIFECYCLE: Debate → Persist → Restart → Delegate → Complete
  // ═══════════════════════════════════════════

  describe("Full Lifecycle Integration", () => {
    it("should support complete debate → restart → delegate → auto-complete flow", async () => {
      // Phase 1: Debate
      const session = initializeCollaborativeSession({
        topic: "Cache Strategy",
        agents: ["backend-architect", "frontend-architect"],
        moderator: "main",
        minRounds: 2,
      });

      const { decisionId } = publishProposal({
        sessionKey: session.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "Cache layer",
        proposal: "Redis with write-through",
        reasoning: "Low latency reads",
      });

      challengeProposal({
        sessionKey: session.sessionKey,
        decisionId,
        agentId: "frontend-architect",
        challenge: "Consider CDN for static assets",
      });

      finalizeDecision({
        sessionKey: session.sessionKey,
        decisionId,
        finalDecision: "Redis for API + CDN for assets",
        moderatorId: "main",
      });

      // Verify all edge types present
      const ctx = getCollaborationContext(session.sessionKey);
      const types = new Set(ctx!.messages.map((m) => m.type));
      expect(types.has("proposal")).toBe(true);
      expect(types.has("challenge")).toBe(true);
      expect(types.has("decision")).toBe(true);
      expect(ctx!.status).toBe("decided");

      // Phase 2: Simulate restart
      await flushPersistence();
      resetCollaborationStateForTests();
      await initCollaborationRegistry();

      const restored = getCollaborationContext(session.sessionKey);
      expect(restored).not.toBeNull();
      expect(restored!.status).toBe("decided");
      expect(restored!.decisions[0]?.consensus?.finalDecision).toBe(
        "Redis for API + CDN for assets",
      );

      // Phase 3: Delegate implementation based on decision
      const deleg = registerDelegation({
        fromAgentId: "main",
        fromSessionKey: "agent:main:main",
        fromRole: "orchestrator",
        toAgentId: "backend-architect",
        toRole: "specialist",
        task: "Implement Redis cache layer as decided in session " + session.sessionKey,
        priority: "high",
      });

      expect(deleg.state).toBe("assigned");

      // Phase 4: Agent gets context with both debate decisions and delegation
      const agentCtx = await buildCollaborationContext({
        debateSessionKey: session.sessionKey,
        agentId: "backend-architect",
        agentRole: "Backend Architect",
        agentExpertise: "Caching, Redis",
      });

      // Should contain debate decisions
      expect(agentCtx.decisionContext).toContain("Redis for API + CDN for assets");
      // Should contain delegation protocol
      expect(agentCtx.systemPromptAddendum).toContain("MANDATORY DELEGATION PROTOCOL");
      expect(agentCtx.systemPromptAddendum).toContain("Implement Redis cache layer");

      // Phase 5: Auto-complete delegation (simulating what subagent-registry does)
      const completed = completeDelegation(deleg.id, {
        status: "success",
        artifact: "Redis cache implemented with write-through strategy",
      });

      expect(completed!.state).toBe("completed");
      expect(completed!.result?.status).toBe("success");

      // Verify the delegation persisted
      const fetchedDeleg = getDelegation(deleg.id);
      expect(fetchedDeleg?.state).toBe("completed");
    });
  });

  // ═══════════════════════════════════════════
  // 7. MULTIPLE CONCURRENT SESSIONS
  // ═══════════════════════════════════════════

  describe("Multiple Concurrent Sessions", () => {
    it("should persist and restore multiple sessions independently", async () => {
      const session1 = initializeCollaborativeSession({
        topic: "Auth",
        agents: ["backend-architect", "security-engineer"],
        moderator: "main",
      });
      const session2 = initializeCollaborativeSession({
        topic: "Database",
        agents: ["backend-architect", "database-engineer"],
        moderator: "main",
      });
      const _session3 = initializeCollaborativeSession({
        topic: "Frontend",
        agents: ["frontend-architect", "ui-designer"],
        moderator: "main",
      });

      publishProposal({
        sessionKey: session1.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "Auth method",
        proposal: "OAuth2",
        reasoning: "Industry standard",
      });
      publishProposal({
        sessionKey: session2.sessionKey,
        agentId: "backend-architect",
        decisionTopic: "ORM",
        proposal: "Drizzle",
        reasoning: "Type-safe",
      });

      expect(getAllCollaborativeSessions()).toHaveLength(3);

      // Restart
      await flushPersistence();
      resetCollaborationStateForTests();
      await initCollaborationRegistry();

      const all = getAllCollaborativeSessions();
      expect(all).toHaveLength(3);

      const topics = all.map((s) => s.topic).toSorted();
      expect(topics).toEqual(["Auth", "Database", "Frontend"]);

      // Verify proposals survived
      const authSession = getCollaborationContext(session1.sessionKey);
      expect(authSession!.messages).toHaveLength(1);
      expect(authSession!.messages[0]?.type).toBe("proposal");
    });
  });
});
