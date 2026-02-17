import { z } from "zod";
import { NonEmptyString, SessionLabelString } from "./primitives.js";

export const SessionsListParamsSchema = z
  .object({
    limit: z.number().int().min(1).optional(),
    activeMinutes: z.number().int().min(1).optional(),
    includeGlobal: z.boolean().optional(),
    includeUnknown: z.boolean().optional(),
    /**
     * Read first 8KB of each session transcript to derive title from first user message.
     * Performs a file read per session - use `limit` to bound result set on large stores.
     */
    includeDerivedTitles: z.boolean().optional(),
    /**
     * Read last 16KB of each session transcript to extract most recent message preview.
     * Performs a file read per session - use `limit` to bound result set on large stores.
     */
    includeLastMessage: z.boolean().optional(),
    label: SessionLabelString.optional(),
    spawnedBy: NonEmptyString.optional(),
    agentId: NonEmptyString.optional(),
    search: z.string().optional(),
  })
  .strict();

export const SessionsPreviewParamsSchema = z
  .object({
    keys: z.array(NonEmptyString).min(1),
    limit: z.number().int().min(1).optional(),
    maxChars: z.number().int().min(20).optional(),
  })
  .strict();

export const SessionsResolveParamsSchema = z
  .object({
    key: NonEmptyString.optional(),
    sessionId: NonEmptyString.optional(),
    label: SessionLabelString.optional(),
    agentId: NonEmptyString.optional(),
    spawnedBy: NonEmptyString.optional(),
    includeGlobal: z.boolean().optional(),
    includeUnknown: z.boolean().optional(),
  })
  .strict();

export const SessionsPatchParamsSchema = z
  .object({
    key: NonEmptyString,
    label: z.union([SessionLabelString, z.null()]).optional(),
    thinkingLevel: z.union([NonEmptyString, z.null()]).optional(),
    verboseLevel: z.union([NonEmptyString, z.null()]).optional(),
    reasoningLevel: z.union([NonEmptyString, z.null()]).optional(),
    responseUsage: z
      .union([
        z.literal("off"),
        z.literal("tokens"),
        z.literal("full"),
        // Backward compat with older clients/stores.
        z.literal("on"),
        z.null(),
      ])
      .optional(),
    elevatedLevel: z.union([NonEmptyString, z.null()]).optional(),
    execHost: z.union([NonEmptyString, z.null()]).optional(),
    execSecurity: z.union([NonEmptyString, z.null()]).optional(),
    execAsk: z.union([NonEmptyString, z.null()]).optional(),
    execNode: z.union([NonEmptyString, z.null()]).optional(),
    model: z.union([NonEmptyString, z.null()]).optional(),
    spawnedBy: z.union([NonEmptyString, z.null()]).optional(),
    spawnDepth: z.union([z.number().int().min(0), z.null()]).optional(),
    sendPolicy: z.union([z.literal("allow"), z.literal("deny"), z.null()]).optional(),
    groupActivation: z.union([z.literal("mention"), z.literal("always"), z.null()]).optional(),
  })
  .strict();

export const SessionsResetParamsSchema = z
  .object({
    key: NonEmptyString,
    reason: z.enum(["new", "reset"]).optional(),
  })
  .strict();

export const SessionsDeleteParamsSchema = z
  .object({
    key: NonEmptyString,
    deleteTranscript: z.boolean().optional(),
  })
  .strict();

export const SessionsCompactParamsSchema = z
  .object({
    key: NonEmptyString,
    maxLines: z.number().int().min(1).optional(),
  })
  .strict();

export const SessionsUsageParamsSchema = z
  .object({
    /** Specific session key to analyze; if omitted returns all sessions. */
    key: NonEmptyString.optional(),
    /** Start date for range filter (YYYY-MM-DD). */
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** End date for range filter (YYYY-MM-DD). */
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Maximum sessions to return (default 50). */
    limit: z.number().int().min(1).optional(),
    /** Include context weight breakdown (systemPromptReport). */
    includeContextWeight: z.boolean().optional(),
  })
  .strict();
