import { isLoopbackAddress } from "./net.js";

export type OriginGuardConfig = {
  /** Explicit whitelist of allowed origins (e.g., ["http://127.0.0.1:18789"]) */
  allowedOrigins?: string[];
  /** Allow requests from loopback IPs without origin check (default: true) */
  allowLoopback?: boolean;
  /** Skip origin check when Bearer token is present (default: true) */
  allowBearerBypass?: boolean;
};

export type OriginCheckResult =
  | { allowed: true; reason: "loopback" | "bearer" | "origin-match" | "safe-method" }
  | { allowed: false; reason: "missing-origin" | "origin-mismatch" };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Validate the Origin/Referer of an HTTP request for CSRF defense-in-depth.
 *
 * Safe methods (GET/HEAD/OPTIONS) always pass. Bearer-authenticated and
 * loopback requests bypass origin checks (API clients don't send Origin).
 */
export function checkRequestOrigin(params: {
  method: string;
  origin: string | undefined;
  referer: string | undefined;
  clientIp: string | undefined;
  hasBearerToken: boolean;
  config: OriginGuardConfig;
}): OriginCheckResult {
  const { method, origin, referer, clientIp, hasBearerToken, config } = params;
  const allowLoopback = config.allowLoopback ?? true;
  const allowBearerBypass = config.allowBearerBypass ?? true;

  // 1. Safe methods never need origin validation
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return { allowed: true, reason: "safe-method" };
  }

  // 2. Bearer token bypass (API/CLI clients authenticate via token, not cookies)
  if (allowBearerBypass && hasBearerToken) {
    return { allowed: true, reason: "bearer" };
  }

  // 3. Loopback bypass (local tools, CLI, same-machine)
  if (allowLoopback && isLoopbackAddress(clientIp)) {
    return { allowed: true, reason: "loopback" };
  }

  // 4. Resolve effective origin from Origin header or Referer fallback
  const effectiveOrigin = origin ?? extractOriginFromReferer(referer);

  if (!effectiveOrigin) {
    return { allowed: false, reason: "missing-origin" };
  }

  // 5. Check against allowedOrigins whitelist
  const allowedOrigins = config.allowedOrigins ?? [];
  if (isOriginAllowed(effectiveOrigin, allowedOrigins)) {
    return { allowed: true, reason: "origin-match" };
  }

  return { allowed: false, reason: "origin-mismatch" };
}

/** Extract the origin portion from a Referer URL (scheme + host + port). */
function extractOriginFromReferer(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Check if an origin matches any entry in the allowed list (case-insensitive). */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  const normalized = origin.toLowerCase();
  return allowedOrigins.some((allowed) => allowed.toLowerCase() === normalized);
}

/** Build the default allowed origins list from gateway config. */
export function buildAllowedOrigins(port: number, extraOrigins?: string[]): string[] {
  const origins: string[] = [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`,
  ];
  if (extraOrigins) {
    origins.push(...extraOrigins);
  }
  return origins;
}
