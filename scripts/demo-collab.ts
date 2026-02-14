/**
 * DEMO: Collaboration System
 *
 * Demonstrates the full cycle of a collaborative session:
 * 1. Initialization
 * 2. Proposals
 * 3. Messaging
 * 4. Moderation intervention
 * 5. Finalization
 */

import type { GatewayClient } from "../src/gateway/server-methods/types.js";

function mockClient(agentId: string): GatewayClient {
  return {
    connect: {
      client: {
        id: agentId,
        version: "1.0.0",
        platform: "demo",
        mode: "agent",
      },
    },
  } as any;
}

// Mock client to interact with the gateway
// In a real scenario, this would be an agent or a CLI tool
async function runDemo() {
  console.log("🚀 Starting Collaboration Demo...\n");

  const serverUrl = process.env.MCP_SERVER_URL || "http://localhost:3000/api/mcp";
  // specific demo implementation details would depend on how we validly connect
  // to the running gateway in this test environment.
  // Since we are inside the monorepo, we can import server methods directly for a unit-test style demo
  // OR we can use the `openclaw-gateway-tool` if we want to test via RPC.

  // For this script, let's use direct imports to simulate the flow,
  // similar to how `collaboration.test.ts` works, but with the new features.

  // We need to dynamic import to avoid build issues in this script file
  const {
    initializeCollaborativeSession,
    publishProposal,
    challengeProposal,
    finalizeDecision,
    collaborationHandlers,
  } = await import("../src/gateway/server-methods/collaboration.js");

  const { loadMessages } = await import("../src/agents/collaboration-messaging.js");

  // 1. Initialize Session
  console.log("1️⃣  Initializing Session...");
  // Direct call (internal trusted)
  const session = initializeCollaborativeSession({
    topic: "Modernize Authentication System",
    agents: ["backend-architect", "frontend-lead", "security-officer"],
    moderator: "cto-bot",
  });
  console.log(`   Session created: ${session.sessionKey}`);

  // 2. Publish Proposal via RPC Handler (authenticated)
  console.log("\n2️⃣  Backend Architect publishing proposal...");
  const publishHandler = collaborationHandlers["collab.proposal.publish"];
  if (publishHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        publishHandler({
          params: {
            sessionKey: session.sessionKey,
            agentId: "backend-architect",
            decisionTopic: "Auth Provider",
            proposal: "Use Clerk.dev for authentication",
            reasoning: "Offloads complexity, handles MFA/Social login out of the box.",
          },
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Proposal failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              console.log("   Proposal published.");
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("backend-architect"),
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        console.error(`   Proposal failed (sync): ${e.message}`);
        reject(e);
      }
    });
  }

  // 3. Send Direct Message (Persistent)
  console.log("\n3️⃣  Security Officer sending persistent message to Backend...");
  // We use the handler wrappers to test the RPC layer logic
  const sendHandler = collaborationHandlers["collab.messages.send"];
  if (sendHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        // Mocking the context/respond for the handler
        sendHandler({
          params: {
            fromAgentId: "security-officer",
            toAgentId: "backend-architect",
            topic: "Security Concerns",
            message: "Hey, have we vetted Clerk's SOC2 compliance?",
          },
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Message send failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              console.log(`   Message sent! ID: ${(data as any).messageId}`);
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("security-officer"),
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        console.error(`   Message send failed (sync): ${e.message}`);
        reject(e);
      }
    });
  }

  // 4. Challenge Proposal
  console.log("\n4️⃣  Security Officer challenging proposal...");
  const challengeHandler = collaborationHandlers["collab.proposal.challenge"];
  if (challengeHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        challengeHandler({
          params: {
            sessionKey: session.sessionKey,
            decisionId: session.decisions[0].id,
            agentId: "security-officer",
            challenge: "Vendor lock-in risk is high.",
            suggestedAlternative: "Use self-hosted solution like Keycloak or Authentik.",
          },
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Challenge failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              console.log("   Challenge recorded.");
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("security-officer"),
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        console.error(`   Challenge failed (sync): ${e.message}`);
        reject(e);
      }
    });
  }

  // 5. Verify Message Persistence
  console.log("\n5️⃣  Verifying message persistence...");
  const messages = await loadMessages({ recipientId: "backend-architect" });
  console.log(`   Found ${messages.length} messages for Backend Architect.`);
  if (messages.length > 0) {
    console.log(`   Latest: "${messages[messages.length - 1].content}"`);
  }

  // 6. Automated Moderation
  console.log("\n6️⃣  Triggering Automated Moderation...");
  const interveneHandler = collaborationHandlers["collab.moderator.intervene"];
  if (interveneHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        interveneHandler({
          params: {
            sessionKey: session.sessionKey,
            moderatorId: "cto-bot",
            interventionType: "question",
          },
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Moderation failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              console.log(`   Moderator Intervened: "${(data as any).message}"`);
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("cto-bot"),
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  // 7. Finalization
  console.log("\n7️⃣  Finalizing Decision...");
  // Fake consensus
  session.roundCount = 5; // force enough rounds
  const finalizeHandler = collaborationHandlers["collab.decision.finalize"];
  if (finalizeHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        finalizeHandler({
          params: {
            sessionKey: session.sessionKey,
            decisionId: session.decisions[0].id,
            finalDecision:
              "Proceed with Clerk.dev but build an abstraction layer to minimize lock-in.",
            moderatorId: "cto-bot",
          },
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Finalization failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              console.log("   Decision Finalized.");
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("cto-bot"),
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  // 8. Expert Consultation Directory
  console.log("\n8️⃣  Consulting Expert Directory...");
  const listExpertsHandler = collaborationHandlers["collab.directory.list"];
  if (listExpertsHandler) {
    await new Promise<void>((resolve, reject) => {
      try {
        listExpertsHandler({
          params: {},
          respond: (success, data, err) => {
            if (!success) {
              console.error(`   Directory list failed: ${err?.message}`);
              reject(new Error(err?.message));
            } else {
              const agents = (data as any).agents;
              console.log(`   Found ${agents.length} agents in directory.`);
              if (agents.length > 0) {
                console.log(`   Example: ${agents[0].agentId} (${agents[0].role})`);
              }
              resolve();
            }
          },
          context: {} as any,
          client: mockClient("worker"), // Anyone can list
          req: {} as any,
          isWebchatConnect: () => false,
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  console.log("\n✅ Demo Completed Successfully!");
  process.exit(0);
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
