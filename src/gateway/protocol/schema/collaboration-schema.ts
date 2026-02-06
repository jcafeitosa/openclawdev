import { z } from "zod";

/**
 * Collaboration Protocol Schemas
 * Validation for all collab.* API calls
 */

export const CollabSessionInitParamsSchema = z.object({
  topic: z.string().min(1).max(500),
  agents: z.array(z.string()).min(2).max(20),
  moderator: z.string().optional(),
  context: z.string().max(5000).optional(),
});

export const CollabProposalPublishParamsSchema = z.object({
  sessionKey: z.string(),
  agentId: z.string(),
  decisionTopic: z.string().min(1).max(200),
  proposal: z.string().min(1).max(5000),
  reasoning: z.string().min(1).max(2000),
});

export const CollabProposalChallengeParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
  agentId: z.string(),
  challenge: z.string().min(1).max(2000),
  suggestedAlternative: z.string().max(2000).optional(),
});

export const CollabProposalAgreeParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
  agentId: z.string(),
  confidence: z.number().min(0).max(1).optional(), // 0-1 confidence score
});

export const CollabDecisionFinalizeParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
  finalDecision: z.string().min(1).max(5000),
  moderatorId: z.string(),
  rationale: z.string().max(1000).optional(),
});

export const CollabSessionGetParamsSchema = z.object({
  sessionKey: z.string(),
});

export const CollabThreadGetParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
});

export const CollabDecisionVoteParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
  agentId: z.string(),
  vote: z.enum(["approve", "reject", "abstain"]),
  confidence: z.number().min(0).max(1).optional(),
});

export const CollabDecisionAppealParamsSchema = z.object({
  sessionKey: z.string(),
  decisionId: z.string(),
  agentId: z.string(),
  appealReason: z.string().min(1).max(2000),
});

export const CollabSessionListParamsSchema = z.object({
  status: z.enum(["planning", "debating", "decided", "archived"]).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export const CollabMetricsGetParamsSchema = z.object({
  sessionKey: z.string(),
});

export type CollabSessionInitParams = z.infer<typeof CollabSessionInitParamsSchema>;
export type CollabProposalPublishParams = z.infer<typeof CollabProposalPublishParamsSchema>;
export type CollabProposalChallengeParams = z.infer<typeof CollabProposalChallengeParamsSchema>;
export type CollabProposalAgreeParams = z.infer<typeof CollabProposalAgreeParamsSchema>;
export type CollabDecisionFinalizeParams = z.infer<typeof CollabDecisionFinalizeParamsSchema>;
export type CollabSessionGetParams = z.infer<typeof CollabSessionGetParamsSchema>;
export type CollabThreadGetParams = z.infer<typeof CollabThreadGetParamsSchema>;
export type CollabDecisionVoteParams = z.infer<typeof CollabDecisionVoteParamsSchema>;
export type CollabDecisionAppealParams = z.infer<typeof CollabDecisionAppealParamsSchema>;
export type CollabSessionListParams = z.infer<typeof CollabSessionListParamsSchema>;
export type CollabMetricsGetParams = z.infer<typeof CollabMetricsGetParamsSchema>;
