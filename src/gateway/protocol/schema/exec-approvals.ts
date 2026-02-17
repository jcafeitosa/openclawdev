import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

export const ExecApprovalsAllowlistEntrySchema = z
  .object({
    id: NonEmptyString.optional(),
    pattern: z.string(),
    lastUsedAt: z.number().int().min(0).optional(),
    lastUsedCommand: z.string().optional(),
    lastResolvedPath: z.string().optional(),
  })
  .strict();

export const ExecApprovalsDefaultsSchema = z
  .object({
    security: z.string().optional(),
    ask: z.string().optional(),
    askFallback: z.string().optional(),
    autoAllowSkills: z.boolean().optional(),
  })
  .strict();

export const ExecApprovalsAgentSchema = z
  .object({
    security: z.string().optional(),
    ask: z.string().optional(),
    askFallback: z.string().optional(),
    autoAllowSkills: z.boolean().optional(),
    allowlist: z.array(ExecApprovalsAllowlistEntrySchema).optional(),
  })
  .strict();

export const ExecApprovalsFileSchema = z
  .object({
    version: z.literal(1),
    socket: z
      .object({
        path: z.string().optional(),
        token: z.string().optional(),
      })
      .strict()
      .optional(),
    defaults: ExecApprovalsDefaultsSchema.optional(),
    agents: z.record(z.string(), ExecApprovalsAgentSchema).optional(),
  })
  .strict();

export const ExecApprovalsSnapshotSchema = z
  .object({
    path: NonEmptyString,
    exists: z.boolean(),
    hash: NonEmptyString,
    file: ExecApprovalsFileSchema,
  })
  .strict();

export const ExecApprovalsGetParamsSchema = z.object({}).strict();

export const ExecApprovalsSetParamsSchema = z
  .object({
    file: ExecApprovalsFileSchema,
    baseHash: NonEmptyString.optional(),
  })
  .strict();

export const ExecApprovalsNodeGetParamsSchema = z
  .object({
    nodeId: NonEmptyString,
  })
  .strict();

export const ExecApprovalsNodeSetParamsSchema = z
  .object({
    nodeId: NonEmptyString,
    file: ExecApprovalsFileSchema,
    baseHash: NonEmptyString.optional(),
  })
  .strict();

export const ExecApprovalRequestParamsSchema = z
  .object({
    id: NonEmptyString.optional(),
    command: NonEmptyString,
    cwd: z.union([z.string(), z.null()]).optional(),
    host: z.union([z.string(), z.null()]).optional(),
    security: z.union([z.string(), z.null()]).optional(),
    ask: z.union([z.string(), z.null()]).optional(),
    agentId: z.union([z.string(), z.null()]).optional(),
    resolvedPath: z.union([z.string(), z.null()]).optional(),
    sessionKey: z.union([z.string(), z.null()]).optional(),
    timeoutMs: z.number().int().min(1).optional(),
    twoPhase: z.boolean().optional(),
  })
  .strict();

export const ExecApprovalResolveParamsSchema = z
  .object({
    id: NonEmptyString,
    decision: NonEmptyString,
  })
  .strict();
