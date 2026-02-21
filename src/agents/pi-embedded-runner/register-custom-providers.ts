/**
 * Register custom OpenClaw API providers in pi-ai's registry.
 *
 * pi-ai ships with a fixed set of registered API IDs (google-gemini-cli, anthropic-messages, etc.).
 * Some OpenClaw providers use custom api strings not registered by pi-ai, which causes
 * `streamSimple` to throw "No API provider registered for api: <id>".
 *
 * This module must be imported before any call to streamSimple / stream.
 * It is a side-effect-only import: `import "./register-custom-providers.js"`.
 */
import {
  registerApiProvider,
  streamGoogleGeminiCli,
  streamSimpleGoogleGeminiCli,
} from "@mariozechner/pi-ai";
import type { ApiProvider } from "@mariozechner/pi-ai";

/**
 * Register google-antigravity as an alias for google-gemini-cli.
 *
 * The google-gemini-cli transport already handles google-antigravity providers:
 * it checks `model.provider === "google-antigravity"` internally to select the correct
 * endpoint, headers (antigravity vs gemini-cli), and request format.
 *
 * IMPORTANT: we must pass the raw (unwrapped) stream functions directly from the pi-ai export,
 * NOT the already-wrapped versions retrieved via getApiProvider(). The registry's
 * registerApiProvider() wraps each function with an api-check guard, so passing an
 * already-wrapped function would cause a double-wrap with conflicting api checks
 * ("google-antigravity" expected vs "google-gemini-cli" expected), leading to:
 *   Error: Mismatched api: google-antigravity expected google-gemini-cli
 */
registerApiProvider({
  api: "google-antigravity",
  // Cast needed: streamGoogleGeminiCli is typed for "google-gemini-cli" but the underlying
  // implementation routes by model.provider (not model.api), so it handles both correctly.
  stream: streamGoogleGeminiCli as unknown as ApiProvider<"google-antigravity">["stream"],
  streamSimple:
    streamSimpleGoogleGeminiCli as unknown as ApiProvider<"google-antigravity">["streamSimple"],
});
