/**
 * TEST SCRIPT: Collaboration Edge Expansion
 *
 * Verifies the new RPCs for full agent-to-agent lifecycle:
 * 1. Spawn sub-agent
 * 2. Delegate task
 * 3. Voting/Agreement
 * 4. Review delegation
 * 5. Complete delegation
 */

// import { createClient } from "@agentclientprotocol/sdk";

// Actually, we use the internal GatewayClient mock as in demo-collab.ts because we are running server-side script
// or using the internal dispatcher.
// Let's use the same pattern as demo-collab.ts which imports `collaborationHandlers` directly or mocks the client.

import type { GatewayClient } from "../src/gateway/server-methods/types.js";
import { resolveAgentRole } from "../src/agents/agent-scope.js";
import { loadConfig } from "../src/config/config.js";
import { collaborationHandlers } from "../src/gateway/server-methods/collaboration.js";

// Mock Client Factory
function mockClient(agentId: string): GatewayClient {
  return {
    connect: {
      client: { id: agentId },
      transport: { type: "mem" },
    },
    // Mock other required properties if needed by handlers
  } as unknown as GatewayClient;
}

// Mock Context
const mockContext: any = {
  broadcast: () => {},
  nodeSendToSession: () => {},
  agentRunSeq: () => {},
};

const mockReq = {} as any;
const mockIsWebchatConnect = () => false;

// Helper to spread args
const commonArgs = { req: mockReq, isWebchatConnect: mockIsWebchatConnect };

// Start Test
async function runTest() {
  console.log("🚀 Starting Collaboration Edges Test...\n");

  const requesterId = "main"; // Orchestrator usually
  const targetId = "backend-architect"; // Sub-agent
  let spawnedSessionKey = "";
  let childRunId = "";

  // 1. SPAWN
  console.log("1️⃣  Testing `collab.agent.spawn`...");
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.agent.spawn"]!({
      params: {
        requesterAgentId: requesterId,
        targetAgentId: targetId,
        task: "Implement test feature",
        timeout: 60,
      },
      ...commonArgs,
      client: mockClient(requesterId),
      context: mockContext,
      respond: (success, result, error) => {
        if (!success) {
          console.error("❌ Spawn Failed:", error);
          process.exit(1);
        }
        console.log("   ✅ Spawn successful:", result);
        spawnedSessionKey = (result as any).sessionKey;
        childRunId = (result as any).runId;
        resolve();
      },
    });
  });

  // 2. DELEGATE
  console.log("\n2️⃣  Testing `collab.delegation.assign`...");
  let delegationId = "";
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.delegation.assign"]!({
      params: {
        fromAgentId: requesterId,
        toAgentId: targetId,
        task: "Specific sub-task for testing",
        priority: "high",
        justification: "Critical path",
      },
      ...commonArgs,
      client: mockClient(requesterId),
      context: mockContext,
      respond: (success, result, error) => {
        if (!success) {
          console.error("❌ Delegate Failed:", error);
          process.exit(1);
        }
        console.log("   ✅ Delegation successful:", result);
        delegationId = (result as any).id;
        resolve();
      },
    });
  });

  // 3. VOTE (Simulated Proposal & Vote)
  console.log("\n3️⃣  Testing `collab.proposal.vote`...");
  // First create a session and proposal
  let sessionKey = "";
  let decisionId = "";

  // Init session
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.session.init"]!({
      params: { topic: "Voting Test", agents: [requesterId, targetId] },
      respond: (s, r) => {
        if (s) {
          sessionKey = (r as any).sessionKey;
        }
        resolve();
      },
      context: mockContext,
      ...commonArgs,
      client: mockClient(requesterId),
    });
  });

  // Publish proposal
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.proposal.publish"]!({
      params: {
        sessionKey,
        agentId: requesterId,
        decisionTopic: "Vote Topic",
        proposal: "Vote Yes",
        reasoning: "Test",
      },
      ...commonArgs,
      client: mockClient(requesterId),
      context: mockContext,
      respond: (s, r, e) => {
        if (!s) {
          console.error("❌ Publish Proposal Failed:", e);
          process.exit(1);
        }
        decisionId = (r as any).decisionId;
        resolve();
      },
    });
  });

  // Cast Vote
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.proposal.vote"]!({
      params: {
        sessionKey,
        decisionId,
        agentId: targetId,
        vote: "approve",
        reason: "Looks good to me",
      },
      ...commonArgs,
      client: mockClient(targetId),
      context: mockContext,
      respond: (success, result, error) => {
        if (!success) {
          console.error("❌ Vote Failed:", error);
          process.exit(1);
        }
        console.log("   ✅ Vote successful:", result);
        resolve();
      },
    });
  });

  // 4. REVIEW (Upward delegation simulation or direct review of existing delegation)
  // Let's verify `collab.delegation.review`.
  // NOTE: `review` is for when a subordinate *requests* something (upward) and it's in `pending_review`.
  // The delegation we created in step 2 was downward, so it went straight to `assigned`.
  // Let's create an UPWARD delegation request to test review.

  console.log("\n4️⃣  Testing `collab.delegation.review` (Upward Request)...");
  let upwardDelegationId = "";

  // Create upward request
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.delegation.assign"]!({
      params: {
        fromAgentId: targetId, // Subordinate
        toAgentId: requesterId, // Superior
        task: "Please approve this budget",
        priority: "normal",
      },
      ...commonArgs,
      client: mockClient(targetId),
      context: mockContext,
      respond: (success, result: any) => {
        console.log("   Created upward request:", result.state); // Should be pending_review
        upwardDelegationId = result.id;
        resolve();
      },
    });
  });

  // Review (Approve)
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.delegation.review"]!({
      params: {
        delegationId: upwardDelegationId,
        reviewerId: requesterId,
        decision: "approve",
        comment: "Budget approved",
      },
      ...commonArgs,
      client: mockClient(requesterId),
      context: mockContext,
      respond: (success, result, error) => {
        if (!success) {
          console.error("❌ Review Failed:", error);
          process.exit(1);
        }
        console.log("   ✅ Review successful:", (result as any).state); // should be assigned
        resolve();
      },
    });
  });

  // 5. COMPLETE
  console.log("\n5️⃣  Testing `collab.delegation.complete`...");
  await new Promise<void>((resolve) => {
    collaborationHandlers["collab.delegation.complete"]!({
      params: {
        delegationId: delegationId, // The first downward delegation
        agentId: targetId, // Assignee
        status: "success",
        artifact: "Here is the code",
      },
      ...commonArgs,
      client: mockClient(targetId),
      context: mockContext,
      respond: (success, result, error) => {
        if (!success) {
          console.error("❌ Complete Failed:", error);
          process.exit(1);
        }
        console.log("   ✅ Completion successful:", (result as any).state);
        resolve();
      },
    });
  });

  console.log("\nTop marks! All tests passed. 🟢");
}

runTest().catch(console.error);
