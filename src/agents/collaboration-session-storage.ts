/**
 * COLLABORATION SESSION STORAGE
 *
 * Persists CollaborativeSession records to disk so they survive gateway restarts.
 * Pattern mirrors delegation-storage.ts: resolveStateDir() + atomic write (tmp+rename).
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import type { CollaborativeSession } from "../gateway/server-methods/collaboration.js";
import { getChildLogger } from "../logging.js";

const log = getChildLogger({ module: "collaboration-session-storage" });

function shouldSilenceStoreIoError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "EACCES" || code === "EPERM" || code === "EROFS";
}

function getCollabSessionStorePath(): string {
  const root = resolveStateDir(process.env, os.homedir);
  return path.join(root, ".collaboration-sessions");
}

function getSessionFilePath(sessionKey: string): string {
  const storePath = getCollabSessionStorePath();
  const sanitized = sessionKey.replace(/[^a-z0-9-_]/g, "-");
  return path.join(storePath, `${sanitized}.json`);
}

export async function saveCollabSession(session: CollaborativeSession): Promise<void> {
  try {
    const storePath = getCollabSessionStorePath();
    await fs.mkdir(storePath, { recursive: true });
    const filePath = getSessionFilePath(session.sessionKey);
    const content = JSON.stringify(session, null, 2);
    // Atomic write: write to temp file then rename to prevent empty/corrupt files
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, content, "utf-8");
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    if (shouldSilenceStoreIoError(err)) {
      return;
    }
    log.error(`Failed to save collaboration session: ${String(err)}`);
  }
}

export async function loadCollabSession(sessionKey: string): Promise<CollaborativeSession | null> {
  try {
    const filePath = getSessionFilePath(sessionKey);
    const content = await fs.readFile(filePath, "utf-8");
    if (!content.trim()) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }
    return JSON.parse(content) as CollaborativeSession;
  } catch (err) {
    if (!shouldSilenceStoreIoError(err)) {
      log.error(`Failed to load collaboration session: ${String(err)}`);
    }
    return null;
  }
}

export async function loadAllCollabSessions(): Promise<Map<string, CollaborativeSession>> {
  const sessions = new Map<string, CollaborativeSession>();
  try {
    const storePath = getCollabSessionStorePath();
    const files = await fs.readdir(storePath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(storePath, file), "utf-8");
        if (!content.trim()) {
          continue;
        }
        const session = JSON.parse(content) as CollaborativeSession;
        if (session.sessionKey) {
          sessions.set(session.sessionKey, session);
        }
      } catch {
        // Skip corrupted files
      }
    }
  } catch {
    // Store dir doesn't exist yet — that's fine
  }
  return sessions;
}

export async function deleteCollabSession(sessionKey: string): Promise<void> {
  try {
    const filePath = getSessionFilePath(sessionKey);
    await fs.unlink(filePath);
  } catch (err) {
    if (!shouldSilenceStoreIoError(err)) {
      log.error(`Failed to delete collaboration session: ${String(err)}`);
    }
  }
}
