import type { GatewayBrowserClient } from "../gateway.ts";

export type VoiceState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  voiceLoading: boolean;
  voiceError: string | null;
  voiceTtsEnabled: boolean;
  voiceTtsProvider: string | null;
  voiceTtsProviders: string[];
  voiceWakeWord: string | null;
  voiceTalkMode: string | null;
};

export async function loadVoiceStatus(state: VoiceState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.voiceLoading) {
    return;
  }
  state.voiceLoading = true;
  state.voiceError = null;
  try {
    const res = await state.client.request<{
      ttsEnabled?: boolean;
      ttsProvider?: string;
      ttsProviders?: string[];
      wakeWord?: string;
      talkMode?: string;
    }>("tts.status", {});
    state.voiceTtsEnabled = res?.ttsEnabled ?? false;
    state.voiceTtsProvider = res?.ttsProvider ?? null;
    state.voiceTtsProviders = res?.ttsProviders ?? [];
    state.voiceWakeWord = res?.wakeWord ?? null;
    state.voiceTalkMode = res?.talkMode ?? null;
  } catch (err) {
    state.voiceError = String(err);
  } finally {
    state.voiceLoading = false;
  }
}

export async function toggleTts(state: VoiceState) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const method = state.voiceTtsEnabled ? "tts.disable" : "tts.enable";
    await state.client.request(method, {});
    state.voiceTtsEnabled = !state.voiceTtsEnabled;
  } catch (err) {
    state.voiceError = String(err);
  }
}

export async function setTtsProvider(state: VoiceState, provider: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("tts.setProvider", { provider });
    state.voiceTtsProvider = provider;
  } catch (err) {
    state.voiceError = String(err);
  }
}

export async function setWakeWord(state: VoiceState, word: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("voicewake.set", { wakeWord: word });
    state.voiceWakeWord = word;
  } catch (err) {
    state.voiceError = String(err);
  }
}

export async function toggleTalkMode(state: VoiceState) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = await state.client.request<{ mode?: string }>("talk.mode", {
      toggle: true,
    });
    state.voiceTalkMode = res?.mode ?? null;
  } catch (err) {
    state.voiceError = String(err);
  }
}
