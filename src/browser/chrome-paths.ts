import path from "node:path";
import { CONFIG_DIR } from "../utils.js";
import { DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME } from "./constants.js";

/**
 * Resolve the user-data directory for an OpenClaw browser profile.
 *
 * Extracted from chrome.ts to avoid pulling in the heavy Chrome launch
 * machinery (spawn, WebSocket, CDP helpers) when only the path is needed
 * (e.g. from profiles-service.ts).
 */
export function resolveOpenClawUserDataDir(profileName = DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME) {
  return path.join(CONFIG_DIR, "browser", profileName, "user-data");
}
