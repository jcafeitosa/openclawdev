export function buildControlUiCspHeader(): string {
  // Control UI: block framing, keep styles permissive.
  // 'unsafe-inline' for script-src is required because Astro emits inline
  // <script> tags for island hydration (client:only / client:load).
  // This is acceptable for a local-only admin dashboard.
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' ws: wss:",
  ].join("; ");
}
