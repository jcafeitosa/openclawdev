import { z } from "zod";
import { INPUT_PROVENANCE_KIND_VALUES } from "../../../sessions/input-provenance.js";
import { NonEmptyString, SessionLabelString } from "./primitives.js";

export const AgentEventSchema = z
  .object({
    runId: NonEmptyString,
    seq: z.number().int().min(0),
    stream: NonEmptyString,
    ts: z.number().int().min(0),
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

export const SendParamsSchema = z
  .object({
    to: NonEmptyString,
    message: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    gifPlayback: z.boolean().optional(),
    channel: z.string().optional(),
    accountId: z.string().optional(),
    /** Optional session key for mirroring delivered output back into the transcript. */
    sessionKey: z.string().optional(),
    idempotencyKey: NonEmptyString,
  })
  .strict();

export const PollParamsSchema = z
  .object({
    to: NonEmptyString,
    question: NonEmptyString,
    options: z.array(NonEmptyString).min(2).max(12),
    maxSelections: z.number().int().min(1).max(12).optional(),
    /** Poll duration in seconds (channel-specific limits may apply). */
    durationSeconds: z.number().int().min(1).max(604_800).optional(),
    durationHours: z.number().int().min(1).optional(),
    /** Send silently (no notification) where supported. */
    silent: z.boolean().optional(),
    /** Poll anonymity where supported (e.g. Telegram polls default to anonymous). */
    isAnonymous: z.boolean().optional(),
    /** Thread id (channel-specific meaning, e.g. Telegram forum topic id). */
    threadId: z.string().optional(),
    channel: z.string().optional(),
    accountId: z.string().optional(),
    idempotencyKey: NonEmptyString,
  })
  .strict();

export const AgentParamsSchema = z
  .object({
    message: NonEmptyString,
    agentId: NonEmptyString.optional(),
    to: z.string().optional(),
    replyTo: z.string().optional(),
    sessionId: z.string().optional(),
    sessionKey: z.string().optional(),
    thinking: z.string().optional(),
    deliver: z.boolean().optional(),
    attachments: z.array(z.unknown()).optional(),
    channel: z.string().optional(),
    replyChannel: z.string().optional(),
    accountId: z.string().optional(),
    replyAccountId: z.string().optional(),
    threadId: z.string().optional(),
    groupId: z.string().optional(),
    groupChannel: z.string().optional(),
    groupSpace: z.string().optional(),
    timeout: z.number().int().min(0).optional(),
    lane: z.string().optional(),
    extraSystemPrompt: z.string().optional(),
    inputProvenance: z
      .object({
        kind: z.enum(INPUT_PROVENANCE_KIND_VALUES),
        sourceSessionKey: z.string().optional(),
        sourceChannel: z.string().optional(),
        sourceTool: z.string().optional(),
      })
      .strict()
      .optional(),
    idempotencyKey: NonEmptyString,
    label: SessionLabelString.optional(),
    spawnedBy: z.string().optional(),
  })
  .strict();

export const AgentIdentityParamsSchema = z
  .object({
    agentId: NonEmptyString.optional(),
    sessionKey: z.string().optional(),
  })
  .strict();

export const AgentIdentityResultSchema = z
  .object({
    agentId: NonEmptyString,
    name: NonEmptyString.optional(),
    avatar: NonEmptyString.optional(),
    emoji: NonEmptyString.optional(),
  })
  .strict();

export const AgentWaitParamsSchema = z
  .object({
    runId: NonEmptyString,
    timeoutMs: z.number().int().min(0).optional(),
  })
  .strict();

export const WakeParamsSchema = z
  .object({
    mode: z.enum(["now", "next-heartbeat"]),
    text: NonEmptyString,
  })
  .strict();
