import type { SessionsPatchResult } from "../session-utils.types.js";
import {
  type AgentEvent,
  AgentEventSchema,
  type AgentIdentityParams,
  AgentIdentityParamsSchema,
  type AgentIdentityResult,
  AgentIdentityResultSchema,
  AgentParamsSchema,
  type AgentSummary,
  AgentSummarySchema,
  type AgentsFileEntry,
  AgentsFileEntrySchema,
  type AgentsCreateParams,
  AgentsCreateParamsSchema,
  type AgentsCreateResult,
  AgentsCreateResultSchema,
  type AgentsUpdateParams,
  AgentsUpdateParamsSchema,
  type AgentsUpdateResult,
  AgentsUpdateResultSchema,
  type AgentsDeleteParams,
  AgentsDeleteParamsSchema,
  type AgentsDeleteResult,
  AgentsDeleteResultSchema,
  type AgentsFilesGetParams,
  AgentsFilesGetParamsSchema,
  type AgentsFilesGetResult,
  AgentsFilesGetResultSchema,
  type AgentsFilesListParams,
  AgentsFilesListParamsSchema,
  type AgentsFilesListResult,
  AgentsFilesListResultSchema,
  type AgentsFilesSetParams,
  AgentsFilesSetParamsSchema,
  type AgentsFilesSetResult,
  AgentsFilesSetResultSchema,
  type AgentsListParams,
  AgentsListParamsSchema,
  type AgentsListResult,
  AgentsListResultSchema,
  type AgentWaitParams,
  AgentWaitParamsSchema,
  type ChannelsLogoutParams,
  ChannelsLogoutParamsSchema,
  type TalkConfigParams,
  TalkConfigParamsSchema,
  type TalkConfigResult,
  TalkConfigResultSchema,
  type ChannelsStatusParams,
  ChannelsStatusParamsSchema,
  type ChannelsStatusResult,
  ChannelsStatusResultSchema,
  type ChatAbortParams,
  ChatAbortParamsSchema,
  type ChatEvent,
  ChatEventSchema,
  ChatHistoryParamsSchema,
  type ChatInjectParams,
  ChatInjectParamsSchema,
  ChatSendParamsSchema,
  type ConfigApplyParams,
  ConfigApplyParamsSchema,
  type ConfigGetParams,
  ConfigGetParamsSchema,
  type ConfigPatchParams,
  ConfigPatchParamsSchema,
  type ConfigSchemaParams,
  ConfigSchemaParamsSchema,
  type ConfigSchemaResponse,
  ConfigSchemaResponseSchema,
  type ConfigSetParams,
  ConfigSetParamsSchema,
  type ConnectParams,
  ConnectParamsSchema,
  type CronAddParams,
  CronAddParamsSchema,
  type CronJob,
  CronJobSchema,
  type CronListParams,
  CronListParamsSchema,
  type CronRemoveParams,
  CronRemoveParamsSchema,
  type CronRunLogEntry,
  type CronRunParams,
  CronRunParamsSchema,
  type CronRunsParams,
  CronRunsParamsSchema,
  type CronStatusParams,
  CronStatusParamsSchema,
  type CronUpdateParams,
  CronUpdateParamsSchema,
  type DevicePairApproveParams,
  DevicePairApproveParamsSchema,
  type DevicePairListParams,
  DevicePairListParamsSchema,
  type DevicePairRejectParams,
  DevicePairRejectParamsSchema,
  type DeviceTokenRevokeParams,
  DeviceTokenRevokeParamsSchema,
  type DeviceTokenRotateParams,
  DeviceTokenRotateParamsSchema,
  type ExecApprovalsGetParams,
  ExecApprovalsGetParamsSchema,
  type ExecApprovalsNodeGetParams,
  ExecApprovalsNodeGetParamsSchema,
  type ExecApprovalsNodeSetParams,
  ExecApprovalsNodeSetParamsSchema,
  type ExecApprovalsSetParams,
  ExecApprovalsSetParamsSchema,
  type ExecApprovalsSnapshot,
  type ExecApprovalRequestParams,
  ExecApprovalRequestParamsSchema,
  type ExecApprovalResolveParams,
  ExecApprovalResolveParamsSchema,
  ErrorCodes,
  type ErrorShape,
  ErrorShapeSchema,
  type EventFrame,
  EventFrameSchema,
  errorShape,
  FsPickDirectoryParamsSchema,
  type GatewayFrame,
  GatewayFrameSchema,
  type HelloOk,
  HelloOkSchema,
  type LogsTailParams,
  LogsTailParamsSchema,
  type LogsTailResult,
  LogsTailResultSchema,
  type ModelsCooldownsParams,
  ModelsCooldownsParamsSchema,
  type ModelsListParams,
  ModelsListParamsSchema,
  type NodeDescribeParams,
  NodeDescribeParamsSchema,
  type NodeEventParams,
  NodeEventParamsSchema,
  type NodeInvokeParams,
  NodeInvokeParamsSchema,
  type NodeInvokeResultParams,
  NodeInvokeResultParamsSchema,
  type NodeListParams,
  NodeListParamsSchema,
  type NodePairApproveParams,
  NodePairApproveParamsSchema,
  type NodePairListParams,
  NodePairListParamsSchema,
  type NodePairRejectParams,
  NodePairRejectParamsSchema,
  type NodePairRequestParams,
  NodePairRequestParamsSchema,
  type NodePairVerifyParams,
  NodePairVerifyParamsSchema,
  type NodeRenameParams,
  NodeRenameParamsSchema,
  type PollParams,
  PollParamsSchema,
  ProjectsListParamsSchema,
  PROTOCOL_VERSION,
  type PresenceEntry,
  PresenceEntrySchema,
  type ProvidersListParams,
  ProvidersListParamsSchema,
  type ProvidersUsageParams,
  ProvidersUsageParamsSchema,
  ProtocolSchemas,
  type RequestFrame,
  RequestFrameSchema,
  type ResponseFrame,
  ResponseFrameSchema,
  SendParamsSchema,
  type SessionsCompactParams,
  SessionsCompactParamsSchema,
  type SessionsDeleteParams,
  SessionsDeleteParamsSchema,
  type SessionsListParams,
  SessionsListParamsSchema,
  type SessionsPatchParams,
  SessionsPatchParamsSchema,
  type SessionsPreviewParams,
  SessionsPreviewParamsSchema,
  type SessionsResetParams,
  SessionsResetParamsSchema,
  type SessionsResolveParams,
  SessionsResolveParamsSchema,
  type SessionsUsageParams,
  SessionsUsageParamsSchema,
  type ShutdownEvent,
  ShutdownEventSchema,
  type SkillsBinsParams,
  SkillsBinsParamsSchema,
  type SkillsBinsResult,
  type SkillsInstallParams,
  SkillsInstallParamsSchema,
  type SkillsStatusParams,
  SkillsStatusParamsSchema,
  type SkillsUpdateParams,
  SkillsUpdateParamsSchema,
  type Snapshot,
  SnapshotSchema,
  type StateVersion,
  StateVersionSchema,
  type TalkModeParams,
  TalkModeParamsSchema,
  type TickEvent,
  TickEventSchema,
  type UpdateRunParams,
  UpdateRunParamsSchema,
  type WakeParams,
  WakeParamsSchema,
  type WebLoginStartParams,
  WebLoginStartParamsSchema,
  type WebLoginWaitParams,
  WebLoginWaitParamsSchema,
  type WizardCancelParams,
  WizardCancelParamsSchema,
  type WizardNextParams,
  WizardNextParamsSchema,
  type WizardNextResult,
  WizardNextResultSchema,
  type WizardStartParams,
  WizardStartParamsSchema,
  type WizardStartResult,
  WizardStartResultSchema,
  type WizardStatusParams,
  WizardStatusParamsSchema,
  type WizardStatusResult,
  WizardStatusResultSchema,
  type WizardStep,
  WizardStepSchema,
} from "./schema.js";
import { type AjvLikeError, createValidator } from "./zod-validator.js";

// --- Validators (Zod-backed, AJV-compatible interface) ---
export const validateConnectParams = createValidator<ConnectParams>(ConnectParamsSchema);
export const validateRequestFrame = createValidator<RequestFrame>(RequestFrameSchema);
export const validateResponseFrame = createValidator<ResponseFrame>(ResponseFrameSchema);
export const validateEventFrame = createValidator<EventFrame>(EventFrameSchema);
export const validateSendParams = createValidator(SendParamsSchema);
export const validatePollParams = createValidator<PollParams>(PollParamsSchema);
export const validateAgentParams = createValidator(AgentParamsSchema);
export const validateAgentIdentityParams =
  createValidator<AgentIdentityParams>(AgentIdentityParamsSchema);
export const validateAgentWaitParams = createValidator<AgentWaitParams>(AgentWaitParamsSchema);
export const validateWakeParams = createValidator<WakeParams>(WakeParamsSchema);
export const validateAgentsListParams = createValidator<AgentsListParams>(AgentsListParamsSchema);
export const validateAgentsCreateParams =
  createValidator<AgentsCreateParams>(AgentsCreateParamsSchema);
export const validateAgentsUpdateParams =
  createValidator<AgentsUpdateParams>(AgentsUpdateParamsSchema);
export const validateAgentsDeleteParams =
  createValidator<AgentsDeleteParams>(AgentsDeleteParamsSchema);
export const validateAgentsFilesListParams = createValidator<AgentsFilesListParams>(
  AgentsFilesListParamsSchema,
);
export const validateAgentsFilesGetParams = createValidator<AgentsFilesGetParams>(
  AgentsFilesGetParamsSchema,
);
export const validateAgentsFilesSetParams = createValidator<AgentsFilesSetParams>(
  AgentsFilesSetParamsSchema,
);
export const validateNodePairRequestParams = createValidator(NodePairRequestParamsSchema);
export const validateNodePairListParams = createValidator(NodePairListParamsSchema);
export const validateNodePairApproveParams = createValidator(NodePairApproveParamsSchema);
export const validateNodePairRejectParams = createValidator(NodePairRejectParamsSchema);
export const validateNodePairVerifyParams = createValidator(NodePairVerifyParamsSchema);
export const validateNodeRenameParams = createValidator(NodeRenameParamsSchema);
export const validateNodeListParams = createValidator(NodeListParamsSchema);
export const validateNodeDescribeParams = createValidator(NodeDescribeParamsSchema);
export const validateNodeInvokeParams = createValidator(NodeInvokeParamsSchema);
export const validateNodeInvokeResultParams = createValidator(NodeInvokeResultParamsSchema);
export const validateNodeEventParams = createValidator(NodeEventParamsSchema);
export const validateSessionsListParams =
  createValidator<SessionsListParams>(SessionsListParamsSchema);
export const validateSessionsPreviewParams = createValidator<SessionsPreviewParams>(
  SessionsPreviewParamsSchema,
);
export const validateSessionsResolveParams = createValidator<SessionsResolveParams>(
  SessionsResolveParamsSchema,
);
export const validateSessionsPatchParams =
  createValidator<SessionsPatchParams>(SessionsPatchParamsSchema);
export const validateSessionsResetParams =
  createValidator<SessionsResetParams>(SessionsResetParamsSchema);
export const validateSessionsDeleteParams = createValidator<SessionsDeleteParams>(
  SessionsDeleteParamsSchema,
);
export const validateSessionsCompactParams = createValidator<SessionsCompactParams>(
  SessionsCompactParamsSchema,
);
export const validateSessionsUsageParams =
  createValidator<SessionsUsageParams>(SessionsUsageParamsSchema);
export const validateConfigGetParams = createValidator(ConfigGetParamsSchema);
export const validateConfigSetParams = createValidator(ConfigSetParamsSchema);
export const validateConfigApplyParams = createValidator(ConfigApplyParamsSchema);
export const validateConfigPatchParams = createValidator(ConfigPatchParamsSchema);
export const validateConfigSchemaParams = createValidator(ConfigSchemaParamsSchema);
export const validateWizardStartParams =
  createValidator<WizardStartParams>(WizardStartParamsSchema);
export const validateWizardNextParams = createValidator<WizardNextParams>(WizardNextParamsSchema);
export const validateWizardCancelParams =
  createValidator<WizardCancelParams>(WizardCancelParamsSchema);
export const validateWizardStatusParams =
  createValidator<WizardStatusParams>(WizardStatusParamsSchema);
export const validateTalkModeParams = createValidator<TalkModeParams>(TalkModeParamsSchema);
export const validateTalkConfigParams = createValidator<TalkConfigParams>(TalkConfigParamsSchema);
export const validateChannelsStatusParams = createValidator<ChannelsStatusParams>(
  ChannelsStatusParamsSchema,
);
export const validateChannelsLogoutParams = createValidator<ChannelsLogoutParams>(
  ChannelsLogoutParamsSchema,
);
export const validateModelsListParams = createValidator<ModelsListParams>(ModelsListParamsSchema);
export const validateModelsCooldownsParams = createValidator<ModelsCooldownsParams>(
  ModelsCooldownsParamsSchema,
);
export const validateSkillsStatusParams =
  createValidator<SkillsStatusParams>(SkillsStatusParamsSchema);
export const validateSkillsBinsParams = createValidator<SkillsBinsParams>(SkillsBinsParamsSchema);
export const validateSkillsInstallParams =
  createValidator<SkillsInstallParams>(SkillsInstallParamsSchema);
export const validateSkillsUpdateParams =
  createValidator<SkillsUpdateParams>(SkillsUpdateParamsSchema);
export const validateCronListParams = createValidator<CronListParams>(CronListParamsSchema);
export const validateCronStatusParams = createValidator<CronStatusParams>(CronStatusParamsSchema);
export const validateCronAddParams = createValidator<CronAddParams>(CronAddParamsSchema);
export const validateCronUpdateParams = createValidator<CronUpdateParams>(CronUpdateParamsSchema);
export const validateCronRemoveParams = createValidator<CronRemoveParams>(CronRemoveParamsSchema);
export const validateCronRunParams = createValidator<CronRunParams>(CronRunParamsSchema);
export const validateCronRunsParams = createValidator<CronRunsParams>(CronRunsParamsSchema);
export const validateDevicePairListParams = createValidator(DevicePairListParamsSchema);
export const validateDevicePairApproveParams = createValidator(DevicePairApproveParamsSchema);
export const validateDevicePairRejectParams = createValidator(DevicePairRejectParamsSchema);
export const validateDeviceTokenRotateParams = createValidator(DeviceTokenRotateParamsSchema);
export const validateDeviceTokenRevokeParams = createValidator(DeviceTokenRevokeParamsSchema);
export const validateExecApprovalsGetParams = createValidator<ExecApprovalsGetParams>(
  ExecApprovalsGetParamsSchema,
);
export const validateExecApprovalsSetParams = createValidator<ExecApprovalsSetParams>(
  ExecApprovalsSetParamsSchema,
);
export const validateExecApprovalRequestParams = createValidator<ExecApprovalRequestParams>(
  ExecApprovalRequestParamsSchema,
);
export const validateExecApprovalResolveParams = createValidator<ExecApprovalResolveParams>(
  ExecApprovalResolveParamsSchema,
);
export const validateExecApprovalsNodeGetParams = createValidator<ExecApprovalsNodeGetParams>(
  ExecApprovalsNodeGetParamsSchema,
);
export const validateExecApprovalsNodeSetParams = createValidator<ExecApprovalsNodeSetParams>(
  ExecApprovalsNodeSetParamsSchema,
);
export const validateLogsTailParams = createValidator(LogsTailParamsSchema);
export const validateChatHistoryParams = createValidator(ChatHistoryParamsSchema);
export const validateChatSendParams = createValidator(ChatSendParamsSchema);
export const validateChatAbortParams = createValidator(ChatAbortParamsSchema);
export const validateChatInjectParams = createValidator(ChatInjectParamsSchema);
export const validateChatEvent = createValidator(ChatEventSchema);
export const validateUpdateRunParams = createValidator(UpdateRunParamsSchema);
export const validateWebLoginStartParams =
  createValidator<WebLoginStartParams>(WebLoginStartParamsSchema);
export const validateWebLoginWaitParams =
  createValidator<WebLoginWaitParams>(WebLoginWaitParamsSchema);
export const validateProvidersListParams =
  createValidator<ProvidersListParams>(ProvidersListParamsSchema);
export const validateProvidersUsageParams = createValidator<ProvidersUsageParams>(
  ProvidersUsageParamsSchema,
);
export const validateProjectsListParams = createValidator(ProjectsListParamsSchema);
export const validateFsPickDirectoryParams = createValidator(FsPickDirectoryParamsSchema);

export function formatValidationErrors(errors: AjvLikeError[] | null | undefined) {
  if (!errors?.length) {
    return "unknown validation error";
  }

  const parts: string[] = [];

  for (const err of errors) {
    const keyword = typeof err?.keyword === "string" ? err.keyword : "";
    const instancePath = typeof err?.instancePath === "string" ? err.instancePath : "";

    if (keyword === "additionalProperties") {
      const params = err?.params as { additionalProperty?: unknown } | undefined;
      const additionalProperty = params?.additionalProperty;
      if (typeof additionalProperty === "string" && additionalProperty.trim()) {
        const where = instancePath ? `at ${instancePath}` : "at root";
        parts.push(`${where}: unexpected property '${additionalProperty}'`);
        continue;
      }
    }

    const message =
      typeof err?.message === "string" && err.message.trim() ? err.message : "validation error";
    const where = instancePath ? `at ${instancePath}: ` : "";
    parts.push(`${where}${message}`);
  }

  // De-dupe while preserving order.
  const unique = Array.from(new Set(parts.filter((part) => part.trim())));
  if (!unique.length) {
    return (
      errors
        .map((e) => e.message)
        .filter(Boolean)
        .join("; ") || "unknown validation error"
    );
  }
  return unique.join("; ");
}

export {
  ConnectParamsSchema,
  HelloOkSchema,
  RequestFrameSchema,
  ResponseFrameSchema,
  EventFrameSchema,
  GatewayFrameSchema,
  PresenceEntrySchema,
  SnapshotSchema,
  ErrorShapeSchema,
  StateVersionSchema,
  AgentEventSchema,
  ChatEventSchema,
  SendParamsSchema,
  PollParamsSchema,
  AgentParamsSchema,
  AgentIdentityParamsSchema,
  AgentIdentityResultSchema,
  WakeParamsSchema,
  NodePairRequestParamsSchema,
  NodePairListParamsSchema,
  NodePairApproveParamsSchema,
  NodePairRejectParamsSchema,
  NodePairVerifyParamsSchema,
  NodeListParamsSchema,
  NodeInvokeParamsSchema,
  SessionsListParamsSchema,
  SessionsPreviewParamsSchema,
  SessionsPatchParamsSchema,
  SessionsResetParamsSchema,
  SessionsDeleteParamsSchema,
  SessionsCompactParamsSchema,
  SessionsUsageParamsSchema,
  ConfigGetParamsSchema,
  ConfigSetParamsSchema,
  ConfigApplyParamsSchema,
  ConfigPatchParamsSchema,
  ConfigSchemaParamsSchema,
  ConfigSchemaResponseSchema,
  WizardStartParamsSchema,
  WizardNextParamsSchema,
  WizardCancelParamsSchema,
  WizardStatusParamsSchema,
  WizardStepSchema,
  WizardNextResultSchema,
  WizardStartResultSchema,
  WizardStatusResultSchema,
  TalkConfigParamsSchema,
  TalkConfigResultSchema,
  ChannelsStatusParamsSchema,
  ChannelsStatusResultSchema,
  ChannelsLogoutParamsSchema,
  WebLoginStartParamsSchema,
  WebLoginWaitParamsSchema,
  AgentSummarySchema,
  AgentsFileEntrySchema,
  AgentsCreateParamsSchema,
  AgentsCreateResultSchema,
  AgentsUpdateParamsSchema,
  AgentsUpdateResultSchema,
  AgentsDeleteParamsSchema,
  AgentsDeleteResultSchema,
  AgentsFilesListParamsSchema,
  AgentsFilesListResultSchema,
  AgentsFilesGetParamsSchema,
  AgentsFilesGetResultSchema,
  AgentsFilesSetParamsSchema,
  AgentsFilesSetResultSchema,
  AgentsListParamsSchema,
  AgentsListResultSchema,
  ModelsListParamsSchema,
  ModelsCooldownsParamsSchema,
  SkillsStatusParamsSchema,
  SkillsInstallParamsSchema,
  SkillsUpdateParamsSchema,
  CronJobSchema,
  CronListParamsSchema,
  CronStatusParamsSchema,
  CronAddParamsSchema,
  CronUpdateParamsSchema,
  CronRemoveParamsSchema,
  CronRunParamsSchema,
  CronRunsParamsSchema,
  LogsTailParamsSchema,
  LogsTailResultSchema,
  ChatHistoryParamsSchema,
  ChatSendParamsSchema,
  ChatInjectParamsSchema,
  UpdateRunParamsSchema,
  TickEventSchema,
  ShutdownEventSchema,
  ProtocolSchemas,
  PROTOCOL_VERSION,
  ErrorCodes,
  errorShape,
  ProvidersListParamsSchema,
  ProvidersUsageParamsSchema,
  ProjectsListParamsSchema,
  FsPickDirectoryParamsSchema,
};

export type {
  GatewayFrame,
  ConnectParams,
  HelloOk,
  RequestFrame,
  ResponseFrame,
  EventFrame,
  PresenceEntry,
  Snapshot,
  ErrorShape,
  StateVersion,
  AgentEvent,
  AgentIdentityParams,
  AgentIdentityResult,
  AgentWaitParams,
  ChatEvent,
  TickEvent,
  ShutdownEvent,
  WakeParams,
  NodePairRequestParams,
  NodePairListParams,
  NodePairApproveParams,
  DevicePairListParams,
  DevicePairApproveParams,
  DevicePairRejectParams,
  ConfigGetParams,
  ConfigSetParams,
  ConfigApplyParams,
  ConfigPatchParams,
  ConfigSchemaParams,
  ConfigSchemaResponse,
  WizardStartParams,
  WizardNextParams,
  WizardCancelParams,
  WizardStatusParams,
  WizardStep,
  WizardNextResult,
  WizardStartResult,
  WizardStatusResult,
  TalkConfigParams,
  TalkConfigResult,
  TalkModeParams,
  ChannelsStatusParams,
  ChannelsStatusResult,
  ChannelsLogoutParams,
  WebLoginStartParams,
  WebLoginWaitParams,
  AgentSummary,
  AgentsFileEntry,
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsFilesListParams,
  AgentsFilesListResult,
  AgentsFilesGetParams,
  AgentsFilesGetResult,
  AgentsFilesSetParams,
  AgentsFilesSetResult,
  AgentsListParams,
  AgentsListResult,
  SkillsStatusParams,
  SkillsBinsParams,
  SkillsBinsResult,
  SkillsInstallParams,
  SkillsUpdateParams,
  NodePairRejectParams,
  NodePairVerifyParams,
  NodeListParams,
  NodeInvokeParams,
  NodeInvokeResultParams,
  NodeEventParams,
  SessionsListParams,
  SessionsPreviewParams,
  SessionsResolveParams,
  SessionsPatchParams,
  SessionsPatchResult,
  SessionsResetParams,
  SessionsDeleteParams,
  SessionsCompactParams,
  SessionsUsageParams,
  CronJob,
  CronListParams,
  CronStatusParams,
  CronAddParams,
  CronUpdateParams,
  CronRemoveParams,
  CronRunParams,
  CronRunsParams,
  CronRunLogEntry,
  ExecApprovalsGetParams,
  ExecApprovalsSetParams,
  ExecApprovalsSnapshot,
  LogsTailParams,
  LogsTailResult,
  PollParams,
  UpdateRunParams,
  ChatInjectParams,
};
