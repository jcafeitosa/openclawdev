/**
 * Debate Convergence Detection — automatically determines when consensus
 * is reached in multi-agent debates and signals readiness for finalization.
 */

export type ConvergenceMetrics = {
  agreementRatio: number; // 0-1, % of agents that agreed
  challengeRatio: number; // 0-1, % of proposals challenged
  roundsSinceLastChallenge: number;
  totalRounds: number;
  convergenceScore: number; // 0-100, overall convergence strength
  recommendation: "continue" | "ready_to_finalize" | "stalled";
  reason: string;
};

export type DebateEntry = {
  agentId: string;
  action: "propose" | "challenge" | "agree" | "finalize";
  round: number;
  content?: string;
};

const CONVERGENCE_THRESHOLD = 75; // Score above this = ready to finalize
const STALL_ROUNDS = 5; // Rounds without new activity = stalled
const MIN_ROUNDS = 3; // Minimum rounds before convergence possible

/**
 * Analyze debate entries and compute convergence metrics.
 */
export function analyzeConvergence(entries: DebateEntry[]): ConvergenceMetrics {
  if (entries.length === 0) {
    return {
      agreementRatio: 0,
      challengeRatio: 0,
      roundsSinceLastChallenge: 0,
      totalRounds: 0,
      convergenceScore: 0,
      recommendation: "continue",
      reason: "No debate entries yet.",
    };
  }

  const agents = new Set(entries.map((e) => e.agentId));
  const maxRound = Math.max(...entries.map((e) => e.round));

  const agreements = entries.filter((e) => e.action === "agree");
  const challenges = entries.filter((e) => e.action === "challenge");
  const proposals = entries.filter((e) => e.action === "propose");

  const agentsWhoAgreed = new Set(agreements.map((e) => e.agentId));
  const agreementRatio = agents.size > 0 ? agentsWhoAgreed.size / agents.size : 0;

  const challengeRatio = proposals.length > 0 ? challenges.length / proposals.length : 0;

  const lastChallengeRound =
    challenges.length > 0 ? Math.max(...challenges.map((e) => e.round)) : 0;
  const roundsSinceLastChallenge = maxRound - lastChallengeRound;

  // Compute convergence score (0-100)
  let score = 0;

  // Agreement weight (40 points max)
  score += agreementRatio * 40;

  // Low challenge rate (30 points max) — fewer recent challenges = more convergence
  const recentChallenges = challenges.filter((c) => c.round >= maxRound - 2);
  const recentChallengeRate = proposals.length > 0 ? recentChallenges.length / proposals.length : 0;
  score += (1 - recentChallengeRate) * 30;

  // Rounds without challenge (20 points max)
  score += Math.min(roundsSinceLastChallenge / 3, 1) * 20;

  // Minimum rounds met (10 points)
  if (maxRound >= MIN_ROUNDS) {
    score += 10;
  }

  // Determine recommendation
  let recommendation: ConvergenceMetrics["recommendation"];
  let reason: string;

  if (score >= CONVERGENCE_THRESHOLD && maxRound >= MIN_ROUNDS) {
    recommendation = "ready_to_finalize";
    reason = `Convergence score ${Math.round(score)}/100 exceeds threshold (${CONVERGENCE_THRESHOLD}). ${agentsWhoAgreed.size}/${agents.size} agents agreed. ${roundsSinceLastChallenge} rounds without challenges.`;
  } else if (roundsSinceLastChallenge >= STALL_ROUNDS && agreementRatio < 0.5) {
    recommendation = "stalled";
    reason = `Debate appears stalled: ${STALL_ROUNDS}+ rounds without activity and low agreement (${Math.round(agreementRatio * 100)}%).`;
  } else {
    recommendation = "continue";
    reason = `Convergence score ${Math.round(score)}/100 below threshold. Continue debate.`;
  }

  return {
    agreementRatio,
    challengeRatio,
    roundsSinceLastChallenge,
    totalRounds: maxRound,
    convergenceScore: Math.round(score),
    recommendation,
    reason,
  };
}

/**
 * Check if a debate should auto-finalize based on convergence metrics.
 */
export function shouldAutoFinalize(entries: DebateEntry[]): boolean {
  const metrics = analyzeConvergence(entries);
  return metrics.recommendation === "ready_to_finalize";
}
