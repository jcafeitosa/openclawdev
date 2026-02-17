import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

export const ModelChoiceSchema = z
  .object({
    id: NonEmptyString,
    name: NonEmptyString,
    provider: NonEmptyString,
    contextWindow: z.number().int().min(1).optional(),
    reasoning: z.boolean().optional(),
  })
  .strict();

export const AgentSummarySchema = z
  .object({
    id: NonEmptyString,
    name: NonEmptyString.optional(),
    identity: z
      .object({
        name: NonEmptyString.optional(),
        theme: NonEmptyString.optional(),
        emoji: NonEmptyString.optional(),
        avatar: NonEmptyString.optional(),
        avatarUrl: NonEmptyString.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const AgentsListParamsSchema = z.object({}).strict();

export const AgentsListResultSchema = z
  .object({
    defaultId: NonEmptyString,
    mainKey: NonEmptyString,
    scope: z.enum(["per-sender", "global"]),
    agents: z.array(AgentSummarySchema),
  })
  .strict();

export const AgentsCreateParamsSchema = z
  .object({
    name: NonEmptyString,
    workspace: NonEmptyString,
    emoji: z.string().optional(),
    avatar: z.string().optional(),
  })
  .strict();

export const AgentsCreateResultSchema = z
  .object({
    ok: z.literal(true),
    agentId: NonEmptyString,
    name: NonEmptyString,
    workspace: NonEmptyString,
  })
  .strict();

export const AgentsUpdateParamsSchema = z
  .object({
    agentId: NonEmptyString,
    name: NonEmptyString.optional(),
    workspace: NonEmptyString.optional(),
    model: NonEmptyString.optional(),
    avatar: z.string().optional(),
  })
  .strict();

export const AgentsUpdateResultSchema = z
  .object({
    ok: z.literal(true),
    agentId: NonEmptyString,
  })
  .strict();

export const AgentsDeleteParamsSchema = z
  .object({
    agentId: NonEmptyString,
    deleteFiles: z.boolean().optional(),
  })
  .strict();

export const AgentsDeleteResultSchema = z
  .object({
    ok: z.literal(true),
    agentId: NonEmptyString,
    removedBindings: z.number().int().min(0),
  })
  .strict();

export const AgentsFileEntrySchema = z
  .object({
    name: NonEmptyString,
    path: NonEmptyString,
    missing: z.boolean(),
    size: z.number().int().min(0).optional(),
    updatedAtMs: z.number().int().min(0).optional(),
    content: z.string().optional(),
  })
  .strict();

export const AgentsFilesListParamsSchema = z
  .object({
    agentId: NonEmptyString,
  })
  .strict();

export const AgentsFilesListResultSchema = z
  .object({
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    files: z.array(AgentsFileEntrySchema),
  })
  .strict();

export const AgentsFilesGetParamsSchema = z
  .object({
    agentId: NonEmptyString,
    name: NonEmptyString,
  })
  .strict();

export const AgentsFilesGetResultSchema = z
  .object({
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  })
  .strict();

export const AgentsFilesSetParamsSchema = z
  .object({
    agentId: NonEmptyString,
    name: NonEmptyString,
    content: z.string(),
  })
  .strict();

export const AgentsFilesSetResultSchema = z
  .object({
    ok: z.literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  })
  .strict();

export const ModelsListParamsSchema = z.object({}).strict();

export const ModelsCooldownsParamsSchema = z.object({}).strict();

export const ModelsListResultSchema = z
  .object({
    models: z.array(ModelChoiceSchema),
  })
  .strict();

export const SkillsStatusParamsSchema = z
  .object({
    agentId: NonEmptyString.optional(),
  })
  .strict();

export const SkillsBinsParamsSchema = z.object({}).strict();

export const SkillsBinsResultSchema = z
  .object({
    bins: z.array(NonEmptyString),
  })
  .strict();

export const SkillsInstallParamsSchema = z
  .object({
    name: NonEmptyString,
    installId: NonEmptyString,
    timeoutMs: z.number().int().min(1000).optional(),
  })
  .strict();

export const SkillsUpdateParamsSchema = z
  .object({
    skillKey: NonEmptyString,
    enabled: z.boolean().optional(),
    apiKey: z.string().optional(),
    env: z.record(NonEmptyString, z.string()).optional(),
  })
  .strict();
