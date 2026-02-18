/**
 * Bridge handlers that map UI-expected RPC method names to existing backend
 * functionality.  The Control UI was built with these method names but the
 * gateway core uses different names or the handlers were never created.
 *
 * Each handler either delegates to an existing internal function or returns
 * sensible empty/default data so the UI can render gracefully.
 */

import { loadConfig } from "../../config/config.js";
import { listSystemPresence } from "../../infra/system-presence.js";
import { loadVoiceWakeConfig } from "../../infra/voicewake.js";
import {
  getTtsProvider,
  isTtsEnabled,
  isTtsProviderConfigured,
  resolveTtsConfig,
  resolveTtsPrefsPath,
  setTtsEnabled,
  setTtsProvider,
} from "../../tts/tts.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { getHierarchySnapshot } from "../server-hierarchy-events.js";
import { formatForLog } from "../ws-log.js";
import type { GatewayRequestHandlers } from "./types.js";

export const uiBridgeHandlers: GatewayRequestHandlers = {
  /**
   * presence.list — UI expects `{ entries: PresenceEntry[] }`.
   * Delegates to the existing `listSystemPresence()` helper.
   */
  "presence.list": ({ respond }) => {
    try {
      const entries = listSystemPresence();
      respond(true, { entries }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * agents.hierarchy — UI expects `{ roots: AgentHierarchyNode[], collaborationEdges, updatedAt }`.
   * Delegates to `getHierarchySnapshot()` which builds a live snapshot from
   * SubagentRunRecords, delegation registry, and collaboration sessions.
   */
  "agents.hierarchy": ({ respond }) => {
    try {
      const snapshot = getHierarchySnapshot();
      respond(true, snapshot, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * voice.status — UI expects a combined TTS + voicewake + talk status.
   * Composes data from tts, voicewake, and talk subsystems.
   */
  "voice.status": async ({ respond }) => {
    try {
      const cfg = loadConfig();
      const ttsConfig = resolveTtsConfig(cfg);
      const prefsPath = resolveTtsPrefsPath(ttsConfig);
      const provider = getTtsProvider(ttsConfig, prefsPath);
      const enabled = isTtsEnabled(ttsConfig, prefsPath);

      // Collect available TTS providers
      const ttsProviders: string[] = [];
      if (isTtsProviderConfigured(ttsConfig, "openai")) {
        ttsProviders.push("openai");
      }
      if (isTtsProviderConfigured(ttsConfig, "elevenlabs")) {
        ttsProviders.push("elevenlabs");
      }
      if (isTtsProviderConfigured(ttsConfig, "edge")) {
        ttsProviders.push("edge");
      }

      // Voice wake word
      let wakeWord: string | null = null;
      try {
        const vwCfg = await loadVoiceWakeConfig();
        wakeWord = vwCfg.triggers?.[0] ?? null;
      } catch {
        // voicewake may not be configured
      }

      respond(
        true,
        {
          ttsEnabled: enabled,
          ttsProvider: provider,
          ttsProviders,
          wakeWord,
          talkMode: null, // talk mode is ephemeral, not persisted
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * voice.toggleTts — Toggle TTS on/off.
   */
  "voice.toggleTts": async ({ respond }) => {
    try {
      const cfg = loadConfig();
      const ttsConfig = resolveTtsConfig(cfg);
      const prefsPath = resolveTtsPrefsPath(ttsConfig);
      const current = isTtsEnabled(ttsConfig, prefsPath);
      setTtsEnabled(prefsPath, !current);
      respond(true, { enabled: !current }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * voice.setTtsProvider — Set the active TTS provider.
   */
  "voice.setTtsProvider": async ({ params, respond }) => {
    const provider = typeof params.provider === "string" ? params.provider.trim() : "";
    if (provider !== "openai" && provider !== "elevenlabs" && provider !== "edge") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "Invalid provider. Use openai, elevenlabs, or edge.",
        ),
      );
      return;
    }
    try {
      const cfg = loadConfig();
      const ttsConfig = resolveTtsConfig(cfg);
      const prefsPath = resolveTtsPrefsPath(ttsConfig);
      setTtsProvider(prefsPath, provider);
      respond(true, { provider }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * voice.setWakeWord — Update the voice wake trigger word.
   */
  "voice.setWakeWord": async ({ params, respond }) => {
    const word = typeof params.word === "string" ? params.word.trim() : "";
    if (!word) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "word is required"));
      return;
    }
    try {
      const { setVoiceWakeTriggers } = await import("../../infra/voicewake.js");
      const result = await setVoiceWakeTriggers([word]);
      respond(true, { triggers: result.triggers }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * voice.toggleTalkMode — Toggle talk mode (broadcast event).
   */
  "voice.toggleTalkMode": ({ respond, context }) => {
    const payload = { enabled: false, phase: null, ts: Date.now() };
    context.broadcast("talk.mode", payload, { dropIfSlow: true });
    respond(true, payload, undefined);
  },

  /**
   * agent-resources.list — UI expects `{ agents: AgentResourceEntry[] }`.
   * This is a dashboard view that aggregates per-agent resource usage.
   * Return empty list when no data available.
   */
  "agent-resources.list": ({ respond }) => {
    respond(true, { agents: [] }, undefined);
  },

  /**
   * status.get — Debug page alias for the `status` handler.
   */
  "status.get": async ({ respond, client, context }) => {
    const handler = (await import("./health.js")).healthHandlers["status"];
    if (handler) {
      await handler({
        req: { id: 0, method: "status" },
        params: {},
        client,
        isWebchatConnect: () => false,
        respond,
        context,
      });
    } else {
      respond(true, {}, undefined);
    }
  },

  /**
   * health.check — Debug page alias for the `health` handler.
   */
  "health.check": async ({ respond, client, context, params }) => {
    const handler = (await import("./health.js")).healthHandlers["health"];
    if (handler) {
      await handler({
        req: { id: 0, method: "health" },
        params,
        client,
        isWebchatConnect: () => false,
        respond,
        context,
      });
    } else {
      respond(true, {}, undefined);
    }
  },

  /**
   * system.info — UI expects basic system info for the overview page.
   * Return runtime information.
   */
  "system.info": ({ respond }) => {
    respond(
      true,
      {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        pid: process.pid,
      },
      undefined,
    );
  },
};
