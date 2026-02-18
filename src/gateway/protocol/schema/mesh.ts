import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

export const MeshPlanStepSchema = z
  .object({
    id: NonEmptyString,
    name: NonEmptyString.optional(),
    prompt: NonEmptyString,
    dependsOn: z.array(NonEmptyString).max(64).optional(),
    agentId: NonEmptyString.optional(),
    sessionKey: NonEmptyString.optional(),
    thinking: z.string().optional(),
    timeoutMs: z.number().int().min(1_000).max(3_600_000).optional(),
  })
  .strict();

export const MeshWorkflowPlanSchema = z
  .object({
    planId: NonEmptyString,
    goal: NonEmptyString,
    createdAt: z.number().int().min(0),
    steps: z.array(MeshPlanStepSchema).min(1).max(128),
  })
  .strict();

export const MeshPlanParamsSchema = z
  .object({
    goal: NonEmptyString,
    steps: z
      .array(
        z
          .object({
            id: NonEmptyString.optional(),
            name: NonEmptyString.optional(),
            prompt: NonEmptyString,
            dependsOn: z.array(NonEmptyString).max(64).optional(),
            agentId: NonEmptyString.optional(),
            sessionKey: NonEmptyString.optional(),
            thinking: z.string().optional(),
            timeoutMs: z.number().int().min(1_000).max(3_600_000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(128)
      .optional(),
  })
  .strict();

export const MeshRunParamsSchema = z
  .object({
    plan: MeshWorkflowPlanSchema,
    continueOnError: z.boolean().optional(),
    maxParallel: z.number().int().min(1).max(16).optional(),
    defaultStepTimeoutMs: z.number().int().min(1_000).max(3_600_000).optional(),
    lane: z.string().optional(),
  })
  .strict();

export const MeshPlanAutoParamsSchema = z
  .object({
    goal: NonEmptyString,
    maxSteps: z.number().int().min(1).max(16).optional(),
    agentId: NonEmptyString.optional(),
    sessionKey: NonEmptyString.optional(),
    thinking: z.string().optional(),
    timeoutMs: z.number().int().min(1_000).max(3_600_000).optional(),
    lane: z.string().optional(),
  })
  .strict();

export const MeshStatusParamsSchema = z
  .object({
    runId: NonEmptyString,
  })
  .strict();

export const MeshRetryParamsSchema = z
  .object({
    runId: NonEmptyString,
    stepIds: z.array(NonEmptyString).min(1).max(128).optional(),
  })
  .strict();

export type MeshPlanParams = z.infer<typeof MeshPlanParamsSchema>;
export type MeshWorkflowPlan = z.infer<typeof MeshWorkflowPlanSchema>;
export type MeshRunParams = z.infer<typeof MeshRunParamsSchema>;
export type MeshPlanAutoParams = z.infer<typeof MeshPlanAutoParamsSchema>;
export type MeshStatusParams = z.infer<typeof MeshStatusParamsSchema>;
export type MeshRetryParams = z.infer<typeof MeshRetryParamsSchema>;
