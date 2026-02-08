import { describe, expect, it } from "vitest";
import {
  buildAllowedOrigins,
  checkRequestOrigin,
  isOriginAllowed,
  type OriginGuardConfig,
} from "./origin-guard.js";

const defaultConfig: OriginGuardConfig = {
  allowedOrigins: ["http://127.0.0.1:18789", "http://localhost:18789"],
  allowLoopback: true,
  allowBearerBypass: true,
};

describe("checkRequestOrigin", () => {
  describe("safe methods", () => {
    it("should allow GET requests without any checks", () => {
      const result = checkRequestOrigin({
        method: "GET",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "safe-method" });
    });

    it("should allow HEAD requests", () => {
      const result = checkRequestOrigin({
        method: "HEAD",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "safe-method" });
    });

    it("should allow OPTIONS requests", () => {
      const result = checkRequestOrigin({
        method: "OPTIONS",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "safe-method" });
    });

    it("should be case-insensitive for method", () => {
      const result = checkRequestOrigin({
        method: "get",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "safe-method" });
    });
  });

  describe("bearer token bypass", () => {
    it("should allow POST with bearer token", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: true,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "bearer" });
    });

    it("should not bypass when allowBearerBypass is false", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: true,
        config: { ...defaultConfig, allowBearerBypass: false },
      });
      expect(result).toEqual({ allowed: false, reason: "missing-origin" });
    });
  });

  describe("loopback bypass", () => {
    it("should allow POST from 127.0.0.1 without origin", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "127.0.0.1",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "loopback" });
    });

    it("should allow POST from ::1 without origin", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "::1",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "loopback" });
    });

    it("should allow POST from ::ffff:127.0.0.1", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "::ffff:127.0.0.1",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: true, reason: "loopback" });
    });

    it("should not bypass when allowLoopback is false", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "127.0.0.1",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: false, reason: "missing-origin" });
    });
  });

  describe("origin validation", () => {
    it("should reject POST without origin from external IP", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result).toEqual({ allowed: false, reason: "missing-origin" });
    });

    it("should allow POST with matching origin", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: "http://127.0.0.1:18789",
        referer: undefined,
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: true, reason: "origin-match" });
    });

    it("should reject POST with mismatched origin", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: "http://evil.com",
        referer: undefined,
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: false, reason: "origin-mismatch" });
    });

    it("should use Referer as fallback when Origin is missing", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: "http://127.0.0.1:18789/some/path",
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: true, reason: "origin-match" });
    });

    it("should reject when Referer origin does not match", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: "http://evil.com/attack",
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: false, reason: "origin-mismatch" });
    });

    it("should handle invalid Referer URL gracefully", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: "not-a-url",
        clientIp: "192.168.1.100",
        hasBearerToken: false,
        config: { ...defaultConfig, allowLoopback: false },
      });
      expect(result).toEqual({ allowed: false, reason: "missing-origin" });
    });
  });

  describe("priority order", () => {
    it("should check safe method before bearer", () => {
      const result = checkRequestOrigin({
        method: "GET",
        origin: "http://evil.com",
        referer: undefined,
        clientIp: "8.8.8.8",
        hasBearerToken: true,
        config: defaultConfig,
      });
      expect(result.reason).toBe("safe-method");
    });

    it("should check bearer before loopback", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: undefined,
        referer: undefined,
        clientIp: "127.0.0.1",
        hasBearerToken: true,
        config: defaultConfig,
      });
      expect(result.reason).toBe("bearer");
    });

    it("should check loopback before origin", () => {
      const result = checkRequestOrigin({
        method: "POST",
        origin: "http://evil.com",
        referer: undefined,
        clientIp: "127.0.0.1",
        hasBearerToken: false,
        config: defaultConfig,
      });
      expect(result.reason).toBe("loopback");
    });
  });
});

describe("isOriginAllowed", () => {
  it("should match exact origin", () => {
    expect(isOriginAllowed("http://localhost:18789", ["http://localhost:18789"])).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(isOriginAllowed("HTTP://LOCALHOST:18789", ["http://localhost:18789"])).toBe(true);
  });

  it("should return false for no match", () => {
    expect(isOriginAllowed("http://evil.com", ["http://localhost:18789"])).toBe(false);
  });

  it("should return false for empty allowedOrigins", () => {
    expect(isOriginAllowed("http://localhost:18789", [])).toBe(false);
  });
});

describe("buildAllowedOrigins", () => {
  it("should include loopback origins for the given port", () => {
    const origins = buildAllowedOrigins(18789);
    expect(origins).toContain("http://127.0.0.1:18789");
    expect(origins).toContain("http://localhost:18789");
    expect(origins).toContain("http://[::1]:18789");
  });

  it("should include extra origins", () => {
    const origins = buildAllowedOrigins(18789, ["https://custom.example.com"]);
    expect(origins).toContain("https://custom.example.com");
    expect(origins).toContain("http://127.0.0.1:18789");
  });

  it("should handle different port numbers", () => {
    const origins = buildAllowedOrigins(3000);
    expect(origins).toContain("http://127.0.0.1:3000");
    expect(origins).toContain("http://localhost:3000");
  });
});
