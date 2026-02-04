import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_AGENT_ID,
  DEFAULT_MAIN_KEY,
  buildAgentMainSessionKey,
  buildAgentPeerSessionKey,
  buildGroupHistoryKey,
  normalizeAccountId,
  normalizeAgentId,
  normalizeMainKey,
  resolveAgentIdFromSessionKey,
  resolveThreadSessionKeys,
  sanitizeAgentId,
  toAgentRequestSessionKey,
  toAgentStoreSessionKey,
} from "./session-key.js";

describe("normalizeMainKey", () => {
  it("returns lowercased trimmed value for a valid string", () => {
    expect(normalizeMainKey("MyKey")).toBe("mykey");
  });

  it("trims whitespace", () => {
    expect(normalizeMainKey("  hello  ")).toBe("hello");
  });

  it("returns DEFAULT_MAIN_KEY for undefined", () => {
    expect(normalizeMainKey(undefined)).toBe(DEFAULT_MAIN_KEY);
  });

  it("returns DEFAULT_MAIN_KEY for null", () => {
    expect(normalizeMainKey(null)).toBe(DEFAULT_MAIN_KEY);
  });

  it("returns DEFAULT_MAIN_KEY for empty string", () => {
    expect(normalizeMainKey("")).toBe(DEFAULT_MAIN_KEY);
  });

  it("returns DEFAULT_MAIN_KEY for whitespace-only string", () => {
    expect(normalizeMainKey("   ")).toBe(DEFAULT_MAIN_KEY);
  });
});

describe("toAgentRequestSessionKey", () => {
  it("returns undefined for undefined input", () => {
    expect(toAgentRequestSessionKey(undefined)).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    expect(toAgentRequestSessionKey(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(toAgentRequestSessionKey("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(toAgentRequestSessionKey("   ")).toBeUndefined();
  });

  it("returns the rest portion of a valid agent session key", () => {
    expect(toAgentRequestSessionKey("agent:mybot:dm:user123")).toBe("dm:user123");
  });

  it("returns the raw key when it does not parse as an agent key", () => {
    expect(toAgentRequestSessionKey("some-random-key")).toBe("some-random-key");
  });

  it("returns rest for a simple agent:id:main key", () => {
    expect(toAgentRequestSessionKey("agent:bot:main")).toBe("main");
  });

  it("returns raw key when only two parts (not valid agent key)", () => {
    expect(toAgentRequestSessionKey("agent:bot")).toBe("agent:bot");
  });
});

describe("toAgentStoreSessionKey", () => {
  it("returns main session key when requestKey is undefined", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: undefined });
    expect(result).toBe("agent:bot:main");
  });

  it("returns main session key when requestKey is null", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: null });
    expect(result).toBe("agent:bot:main");
  });

  it("returns main session key when requestKey is empty", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "" });
    expect(result).toBe("agent:bot:main");
  });

  it("returns main session key when requestKey is whitespace", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "   " });
    expect(result).toBe("agent:bot:main");
  });

  it('returns main session key when requestKey is "main"', () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "main" });
    expect(result).toBe("agent:bot:main");
  });

  it("uses custom mainKey when requestKey is empty", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "", mainKey: "custom" });
    expect(result).toBe("agent:bot:custom");
  });

  it("returns lowered key if requestKey starts with agent:", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "agent:Other:SomeKey" });
    expect(result).toBe("agent:other:somekey");
  });

  it("prefixes with agent:agentId: for a plain requestKey", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "dm:user1" });
    expect(result).toBe("agent:bot:dm:user1");
  });

  it("prefixes subagent keys with agent:agentId:", () => {
    const result = toAgentStoreSessionKey({ agentId: "bot", requestKey: "subagent:child:key" });
    expect(result).toBe("agent:bot:subagent:child:key");
  });

  it("normalizes agentId in the output", () => {
    const result = toAgentStoreSessionKey({ agentId: "My Bot!", requestKey: "session1" });
    expect(result).toBe("agent:my-bot:session1");
  });
});

describe("resolveAgentIdFromSessionKey", () => {
  it("extracts agentId from a valid agent session key", () => {
    expect(resolveAgentIdFromSessionKey("agent:mybot:main")).toBe("mybot");
  });

  it("returns DEFAULT_AGENT_ID for undefined", () => {
    expect(resolveAgentIdFromSessionKey(undefined)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for null", () => {
    expect(resolveAgentIdFromSessionKey(null)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for empty string", () => {
    expect(resolveAgentIdFromSessionKey("")).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for non-agent key", () => {
    expect(resolveAgentIdFromSessionKey("some-key")).toBe(DEFAULT_AGENT_ID);
  });

  it("normalizes extracted agentId to lowercase", () => {
    expect(resolveAgentIdFromSessionKey("agent:MyBot:main")).toBe("mybot");
  });

  it("returns DEFAULT_AGENT_ID for key with only two parts", () => {
    expect(resolveAgentIdFromSessionKey("agent:bot")).toBe(DEFAULT_AGENT_ID);
  });
});

describe("normalizeAgentId", () => {
  it("returns lowercase for a valid ID", () => {
    expect(normalizeAgentId("MyBot")).toBe("mybot");
  });

  it("returns DEFAULT_AGENT_ID for undefined", () => {
    expect(normalizeAgentId(undefined)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for null", () => {
    expect(normalizeAgentId(null)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for empty string", () => {
    expect(normalizeAgentId("")).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for whitespace-only", () => {
    expect(normalizeAgentId("   ")).toBe(DEFAULT_AGENT_ID);
  });

  it("keeps underscores and hyphens", () => {
    expect(normalizeAgentId("my_bot-1")).toBe("my_bot-1");
  });

  it("replaces invalid characters with dashes", () => {
    expect(normalizeAgentId("my bot!")).toBe("my-bot");
  });

  it("strips leading dashes after replacement", () => {
    expect(normalizeAgentId("!!bot")).toBe("bot");
  });

  it("strips trailing dashes after replacement", () => {
    expect(normalizeAgentId("bot!!")).toBe("bot");
  });

  it("strips both leading and trailing dashes", () => {
    expect(normalizeAgentId("--bot--")).toBe("bot");
  });

  it("collapses consecutive invalid chars into a single dash", () => {
    expect(normalizeAgentId("my   bot")).toBe("my-bot");
  });

  it("returns DEFAULT_AGENT_ID when all chars are invalid", () => {
    expect(normalizeAgentId("!!!")).toBe(DEFAULT_AGENT_ID);
  });

  it("truncates to 64 characters", () => {
    const longId = "a".repeat(100);
    expect(normalizeAgentId(longId)).toHaveLength(64);
  });

  it("trims whitespace before normalizing", () => {
    expect(normalizeAgentId("  bot  ")).toBe("bot");
  });

  it("allows digits at start for valid IDs", () => {
    expect(normalizeAgentId("1bot")).toBe("1bot");
  });
});

describe("sanitizeAgentId", () => {
  it("behaves the same as normalizeAgentId for valid IDs", () => {
    expect(sanitizeAgentId("MyBot")).toBe("mybot");
  });

  it("returns DEFAULT_AGENT_ID for undefined", () => {
    expect(sanitizeAgentId(undefined)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for null", () => {
    expect(sanitizeAgentId(null)).toBe(DEFAULT_AGENT_ID);
  });

  it("returns DEFAULT_AGENT_ID for empty string", () => {
    expect(sanitizeAgentId("")).toBe(DEFAULT_AGENT_ID);
  });

  it("replaces invalid characters with dashes", () => {
    expect(sanitizeAgentId("my bot!")).toBe("my-bot");
  });

  it("strips leading and trailing dashes", () => {
    expect(sanitizeAgentId("--hello--")).toBe("hello");
  });

  it("returns DEFAULT_AGENT_ID when all chars are invalid", () => {
    expect(sanitizeAgentId("@#$")).toBe(DEFAULT_AGENT_ID);
  });
});

describe("normalizeAccountId", () => {
  it("returns lowercase for a valid ID", () => {
    expect(normalizeAccountId("Account1")).toBe("account1");
  });

  it("returns DEFAULT_ACCOUNT_ID for undefined", () => {
    expect(normalizeAccountId(undefined)).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("returns DEFAULT_ACCOUNT_ID for null", () => {
    expect(normalizeAccountId(null)).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("returns DEFAULT_ACCOUNT_ID for empty string", () => {
    expect(normalizeAccountId("")).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("returns DEFAULT_ACCOUNT_ID for whitespace-only", () => {
    expect(normalizeAccountId("   ")).toBe(DEFAULT_ACCOUNT_ID);
  });

  it("replaces invalid characters with dashes", () => {
    expect(normalizeAccountId("acc@id")).toBe("acc-id");
  });

  it("strips leading and trailing dashes", () => {
    expect(normalizeAccountId("--acc--")).toBe("acc");
  });

  it("returns DEFAULT_ACCOUNT_ID when all chars are invalid", () => {
    expect(normalizeAccountId("@#$")).toBe(DEFAULT_ACCOUNT_ID);
  });
});

describe("buildAgentMainSessionKey", () => {
  it("builds key with default main key", () => {
    expect(buildAgentMainSessionKey({ agentId: "bot" })).toBe("agent:bot:main");
  });

  it("builds key with custom main key", () => {
    expect(buildAgentMainSessionKey({ agentId: "bot", mainKey: "custom" })).toBe(
      "agent:bot:custom",
    );
  });

  it("normalizes agentId", () => {
    expect(buildAgentMainSessionKey({ agentId: "My Bot!" })).toBe("agent:my-bot:main");
  });

  it("normalizes mainKey", () => {
    expect(buildAgentMainSessionKey({ agentId: "bot", mainKey: "  CUSTOM  " })).toBe(
      "agent:bot:custom",
    );
  });

  it("uses DEFAULT_MAIN_KEY when mainKey is undefined", () => {
    expect(buildAgentMainSessionKey({ agentId: "bot", mainKey: undefined })).toBe("agent:bot:main");
  });

  it("uses DEFAULT_MAIN_KEY when mainKey is empty", () => {
    expect(buildAgentMainSessionKey({ agentId: "bot", mainKey: "" })).toBe("agent:bot:main");
  });
});

describe("buildAgentPeerSessionKey", () => {
  describe("DM with scope main (default)", () => {
    it("returns main session key when peerKind is dm and scope is main", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        dmScope: "main",
      });
      expect(result).toBe("agent:bot:main");
    });

    it("defaults to dm peerKind and main scope", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
      });
      expect(result).toBe("agent:bot:main");
    });

    it("uses custom mainKey for main scope DM", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        mainKey: "custom",
        dmScope: "main",
      });
      expect(result).toBe("agent:bot:custom");
    });
  });

  describe("DM with scope per-peer", () => {
    it("builds per-peer DM key with peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-peer",
      });
      expect(result).toBe("agent:bot:dm:user123");
    });

    it("lowercases peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "User123",
        dmScope: "per-peer",
      });
      expect(result).toBe("agent:bot:dm:user123");
    });

    it("falls back to main key when peerId is empty with per-peer scope", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "",
        dmScope: "per-peer",
      });
      expect(result).toBe("agent:bot:main");
    });

    it("falls back to main key when peerId is null with per-peer scope", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: null,
        dmScope: "per-peer",
      });
      expect(result).toBe("agent:bot:main");
    });
  });

  describe("DM with scope per-channel-peer", () => {
    it("builds per-channel-peer DM key", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-channel-peer",
      });
      expect(result).toBe("agent:bot:telegram:dm:user123");
    });

    it("lowercases channel and peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "Telegram",
        peerKind: "dm",
        peerId: "User123",
        dmScope: "per-channel-peer",
      });
      expect(result).toBe("agent:bot:telegram:dm:user123");
    });

    it("uses unknown for empty channel", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-channel-peer",
      });
      expect(result).toBe("agent:bot:unknown:dm:user123");
    });

    it("falls back to main key when peerId is empty", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "",
        dmScope: "per-channel-peer",
      });
      expect(result).toBe("agent:bot:main");
    });
  });

  describe("DM with scope per-account-channel-peer", () => {
    it("builds per-account-channel-peer DM key", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        accountId: "acc1",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-account-channel-peer",
      });
      expect(result).toBe("agent:bot:telegram:acc1:dm:user123");
    });

    it("normalizes accountId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        accountId: "  ACC1  ",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-account-channel-peer",
      });
      expect(result).toBe("agent:bot:telegram:acc1:dm:user123");
    });

    it("uses DEFAULT_ACCOUNT_ID when accountId is null", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        accountId: null,
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-account-channel-peer",
      });
      expect(result).toBe("agent:bot:telegram:default:dm:user123");
    });

    it("falls back to main key when peerId is empty", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        accountId: "acc1",
        peerKind: "dm",
        peerId: "",
        dmScope: "per-account-channel-peer",
      });
      expect(result).toBe("agent:bot:main");
    });
  });

  describe("DM with identityLinks", () => {
    it("resolves linked peerId for per-peer scope", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-peer",
        identityLinks: {
          canonical_user: ["user123", "discord:user456"],
        },
      });
      expect(result).toBe("agent:bot:dm:canonical_user");
    });

    it("does not resolve identityLinks for main scope", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "main",
        identityLinks: {
          canonical_user: ["user123"],
        },
      });
      expect(result).toBe("agent:bot:main");
    });

    it("resolves scoped identityLinks using channel:peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "telegram",
        peerKind: "dm",
        peerId: "user123",
        dmScope: "per-peer",
        identityLinks: {
          canonical_user: ["telegram:user123"],
        },
      });
      expect(result).toBe("agent:bot:dm:canonical_user");
    });
  });

  describe("group peerKind", () => {
    it("builds group session key", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "discord",
        peerKind: "group",
        peerId: "group123",
      });
      expect(result).toBe("agent:bot:discord:group:group123");
    });

    it("lowercases channel and peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "Discord",
        peerKind: "group",
        peerId: "Group123",
      });
      expect(result).toBe("agent:bot:discord:group:group123");
    });

    it("uses unknown for empty channel", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "",
        peerKind: "group",
        peerId: "group123",
      });
      expect(result).toBe("agent:bot:unknown:group:group123");
    });

    it("uses unknown for empty peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "discord",
        peerKind: "group",
        peerId: "",
      });
      expect(result).toBe("agent:bot:discord:group:unknown");
    });

    it("uses unknown for null peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "discord",
        peerKind: "group",
        peerId: null,
      });
      expect(result).toBe("agent:bot:discord:group:unknown");
    });
  });

  describe("channel peerKind", () => {
    it("builds channel session key", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "slack",
        peerKind: "channel",
        peerId: "chan123",
      });
      expect(result).toBe("agent:bot:slack:channel:chan123");
    });

    it("uses unknown for empty peerId", () => {
      const result = buildAgentPeerSessionKey({
        agentId: "bot",
        channel: "slack",
        peerKind: "channel",
        peerId: "",
      });
      expect(result).toBe("agent:bot:slack:channel:unknown");
    });
  });
});

describe("buildGroupHistoryKey", () => {
  it("builds a group history key", () => {
    const result = buildGroupHistoryKey({
      channel: "discord",
      accountId: "acc1",
      peerKind: "group",
      peerId: "group123",
    });
    expect(result).toBe("discord:acc1:group:group123");
  });

  it("builds a channel history key", () => {
    const result = buildGroupHistoryKey({
      channel: "slack",
      accountId: "acc1",
      peerKind: "channel",
      peerId: "chan123",
    });
    expect(result).toBe("slack:acc1:channel:chan123");
  });

  it("lowercases channel and peerId", () => {
    const result = buildGroupHistoryKey({
      channel: "Discord",
      peerKind: "group",
      peerId: "Group123",
    });
    expect(result).toBe("discord:default:group:group123");
  });

  it("uses DEFAULT_ACCOUNT_ID when accountId is null", () => {
    const result = buildGroupHistoryKey({
      channel: "discord",
      accountId: null,
      peerKind: "group",
      peerId: "group123",
    });
    expect(result).toBe("discord:default:group:group123");
  });

  it("uses DEFAULT_ACCOUNT_ID when accountId is undefined", () => {
    const result = buildGroupHistoryKey({
      channel: "discord",
      peerKind: "group",
      peerId: "group123",
    });
    expect(result).toBe("discord:default:group:group123");
  });

  it("uses unknown for empty channel", () => {
    const result = buildGroupHistoryKey({
      channel: "",
      peerKind: "group",
      peerId: "group123",
    });
    expect(result).toBe("unknown:default:group:group123");
  });

  it("uses unknown for empty peerId", () => {
    const result = buildGroupHistoryKey({
      channel: "discord",
      peerKind: "group",
      peerId: "",
    });
    expect(result).toBe("discord:default:group:unknown");
  });
});

describe("resolveThreadSessionKeys", () => {
  it("returns baseSessionKey when threadId is absent", () => {
    const result = resolveThreadSessionKeys({ baseSessionKey: "agent:bot:main" });
    expect(result).toEqual({ sessionKey: "agent:bot:main", parentSessionKey: undefined });
  });

  it("returns baseSessionKey when threadId is null", () => {
    const result = resolveThreadSessionKeys({ baseSessionKey: "agent:bot:main", threadId: null });
    expect(result).toEqual({ sessionKey: "agent:bot:main", parentSessionKey: undefined });
  });

  it("returns baseSessionKey when threadId is empty", () => {
    const result = resolveThreadSessionKeys({ baseSessionKey: "agent:bot:main", threadId: "" });
    expect(result).toEqual({ sessionKey: "agent:bot:main", parentSessionKey: undefined });
  });

  it("returns baseSessionKey when threadId is whitespace only", () => {
    const result = resolveThreadSessionKeys({ baseSessionKey: "agent:bot:main", threadId: "   " });
    expect(result).toEqual({ sessionKey: "agent:bot:main", parentSessionKey: undefined });
  });

  it("appends thread suffix by default (useSuffix=true)", () => {
    const result = resolveThreadSessionKeys({
      baseSessionKey: "agent:bot:main",
      threadId: "thread1",
    });
    expect(result).toEqual({
      sessionKey: "agent:bot:main:thread:thread1",
      parentSessionKey: undefined,
    });
  });

  it("lowercases threadId in the suffix", () => {
    const result = resolveThreadSessionKeys({
      baseSessionKey: "agent:bot:main",
      threadId: "THREAD1",
    });
    expect(result).toEqual({
      sessionKey: "agent:bot:main:thread:thread1",
      parentSessionKey: undefined,
    });
  });

  it("includes parentSessionKey when provided with thread suffix", () => {
    const result = resolveThreadSessionKeys({
      baseSessionKey: "agent:bot:main",
      threadId: "thread1",
      parentSessionKey: "agent:bot:main",
    });
    expect(result).toEqual({
      sessionKey: "agent:bot:main:thread:thread1",
      parentSessionKey: "agent:bot:main",
    });
  });

  it("returns baseSessionKey as sessionKey when useSuffix is false", () => {
    const result = resolveThreadSessionKeys({
      baseSessionKey: "agent:bot:main",
      threadId: "thread1",
      useSuffix: false,
    });
    expect(result).toEqual({
      sessionKey: "agent:bot:main",
      parentSessionKey: undefined,
    });
  });

  it("preserves parentSessionKey when useSuffix is false", () => {
    const result = resolveThreadSessionKeys({
      baseSessionKey: "agent:bot:main",
      threadId: "thread1",
      parentSessionKey: "agent:bot:parent",
      useSuffix: false,
    });
    expect(result).toEqual({
      sessionKey: "agent:bot:main",
      parentSessionKey: "agent:bot:parent",
    });
  });
});

describe("constants", () => {
  it("has correct default values", () => {
    expect(DEFAULT_AGENT_ID).toBe("main");
    expect(DEFAULT_MAIN_KEY).toBe("main");
    expect(DEFAULT_ACCOUNT_ID).toBe("default");
  });
});
