/**
 * TEST: Collaboration Security Scenarios
 *
 * Verifies:
 * 1. Unauthorized actions (Impersonation) are blocked.
 * 2. Authorized actions proceed.
 * 3. Directory listing works.
 */

import type { GatewayClient } from "../src/gateway/server-methods/types.js";

function mockClient(agentId: string): GatewayClient {
  return {
    connect: {
      client: {
        id: agentId,
        version: "1.0.0",
        platform: "test",
        mode: "agent",
      },
    },
  } as any;
}

async function runTest() {
  console.log("🛡️  Starting Collaboration Security Tests...\n");

  // Dynamic import to load server methods
  const { initializeCollaborativeSession, publishProposal, collaborationHandlers } =
    await import("../src/gateway/server-methods/collaboration.js");

  // 1. Setup Session
  console.log("1️⃣  Initializing Session...");
  const session = initializeCollaborativeSession({
    topic: "Security Test Session",
    agents: ["alice", "bob", "eve"],
    moderator: "admin",
  });
  console.log(`   Session: ${session.sessionKey}`);

  // 2. Test: Authorized Proposal (Alice acts as Alice) - SHOULD PASS
  console.log("\n2️⃣  Test: Authorized Proposal (Alice -> Alice)...");
  const publishHandler = collaborationHandlers["collab.proposal.publish"];

  try {
    await new Promise<void>((resolve, reject) => {
      publishHandler({
        params: {
          sessionKey: session.sessionKey,
          agentId: "alice",
          decisionTopic: "Test Topic",
          proposal: "Alice's Proposal",
          reasoning: "Valid",
        },
        respond: (success, data, err) => {
          if (success) {
            console.log("   ✅ Success (Expected)");
            resolve();
          } else {
            reject(new Error(`Failed: ${err?.message}`));
          }
        },
        context: {} as any,
        client: mockClient("alice"), // Correct Identity
        req: {} as any,
        isWebchatConnect: () => false,
      });
    });
  } catch (e: any) {
    console.error(`   ❌ Failed unexpected: ${e.message}`);
    process.exit(1);
  }

  // 3. Test: Un-Authorized Proposal (Eve tries to act as Bob) - SHOULD FAIL
  console.log("\n3️⃣  Test: Impersonation Attack (Eve -> Bob)...");
  try {
    await new Promise<void>((resolve, reject) => {
      publishHandler({
        params: {
          sessionKey: session.sessionKey,
          agentId: "bob", // TARGET
          decisionTopic: "Test Topic",
          proposal: "Eve's Malicious Proposal",
          reasoning: "Evil",
        },
        respond: (success, data, err) => {
          if (success) {
            console.error("   ❌ FAILED: Operation succeeded but should have been blocked!");
            reject(new Error("Security Bypass Detected"));
          } else {
            // We expect failure only here!
            console.log(`   ✅ Blocked (Expected): ${err?.message}`);
            resolve();
          }
        },
        context: {} as any,
        client: mockClient("eve"), // ATTACKER Identity
        req: {} as any,
        isWebchatConnect: () => false,
      });
    });
  } catch (e: any) {
    // If the handler throws (which assertClientIdentity does), we catch it here
    if (e.message.includes("Not authorized") || e.message.includes("cannot act as")) {
      console.log(`   ✅ Blocked (Expected Exception): ${e.message}`);
    } else {
      console.error(`   ❌ Failed with unexpected error: ${e.message}`);
      process.exit(1);
    }
  }

  // 4. Test: Directory Listing
  console.log("\n4️⃣  Test: Expert Directory Listing...");
  const dirHandler = collaborationHandlers["collab.directory.list"];
  try {
    await new Promise<void>((resolve, reject) => {
      dirHandler({
        params: {},
        respond: (success, data, err) => {
          if (success) {
            const agents = (data as any).agents;
            if (Array.isArray(agents) && agents.length > 0) {
              console.log(`   ✅ Success: Retrieved ${agents.length} agents.`);
              resolve();
            } else {
              reject(new Error("Agent list empty or invalid"));
            }
          } else {
            reject(new Error(`Failed: ${err?.message}`));
          }
        },
        context: {} as any,
        client: mockClient("alice"),
        req: {} as any,
        isWebchatConnect: () => false,
      });
    });
  } catch (e: any) {
    console.error(`   ❌ Failed: ${e.message}`);
    process.exit(1);
  }

  console.log("\n✅ Security Scenarios Passed!");
  process.exit(0);
}

runTest().catch(console.error);
