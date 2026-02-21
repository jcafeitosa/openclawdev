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
import { getApiProvider, registerApiProvider } from "@mariozechner/pi-ai";
import type { ApiProvider } from "@mariozechner/pi-ai";

/**
 * Register google-antigravity as an alias for google-gemini-cli.
 *
 * The google-gemini-cli transport already handles google-antigravity providers:
 * it checks `model.provider === "google-antigravity"` internally to select the correct
 * endpoint, headers (antigravity vs gemini-cli), and request format.
 *
 * Only the api registry lookup fails because "google-antigravity" was never registered
 * as an api ID in pi-ai's built-in registry.
 */
function registerGoogleAntigravityProvider(): void {
  const geminiCliProvider = getApiProvider("google-gemini-cli");
  if (!geminiCliProvider) {
    return;
  }
  const provider: ApiProvider = {
    api: "google-antigravity",
    stream: geminiCliProvider.stream as ApiProvider["stream"],
    streamSimple: geminiCliProvider.streamSimple as ApiProvider["streamSimple"],
  };
  registerApiProvider(provider);
}

registerGoogleAntigravityProvider();
