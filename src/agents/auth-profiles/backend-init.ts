import { log } from "./constants.js";
import { parseEncryptionKey } from "./crypto.js";
import { setAuthStoreBackend } from "./store.js";

/**
 * Initialize the auth store backend based on environment configuration.
 *
 * If AUTH_ENCRYPTION_KEY is set and the database is reachable, switches
 * to the encrypted DB backend. Otherwise keeps the default file backend.
 *
 * Should be called once during gateway startup, after DB connection is established.
 */
export async function initAuthStoreBackend(): Promise<"db" | "file"> {
  const rawKey = process.env.AUTH_ENCRYPTION_KEY;

  // If the env var is not set at all, use the unencrypted file backend (default behaviour).
  if (!rawKey || !rawKey.trim()) {
    return "file";
  }

  // The env var IS set — it must be a valid key. Silently falling back to the
  // file backend when the key is misconfigured would store credentials in plain
  // text without any indication to the operator.
  const encryptionKey = parseEncryptionKey(rawKey);
  if (!encryptionKey) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY is set but is not a valid encryption key. " +
        "Expected a 64-character hex string or a 44-character base64 string (32 bytes). " +
        "Fix or unset AUTH_ENCRYPTION_KEY before starting the gateway.",
    );
  }

  // Only import DB dependencies when actually needed (avoids import cost when using file backend)
  const { isDatabaseConnected } = await import("../../infra/database/client.js");
  const dbConnected = await isDatabaseConnected();
  if (!dbConnected) {
    log.warn("AUTH_ENCRYPTION_KEY is set but database is not reachable — using file backend");
    return "file";
  }

  const { DbAuthStoreBackend } = await import("./backend-db.js");
  const keyVersion = Number(process.env.AUTH_KEY_VERSION ?? 1);
  const backend = new DbAuthStoreBackend(encryptionKey, keyVersion);
  setAuthStoreBackend(backend);
  log.info("auth store backend switched to encrypted DB");
  return "db";
}
