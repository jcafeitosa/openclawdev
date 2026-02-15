import type { Server } from "node:http";
import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import fs from "node:fs/promises";
import { SafeOpenError, openFileWithinRoot } from "../infra/fs-safe.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { detectMime } from "./mime.js";
import { cleanOldMedia, getMediaDir, MEDIA_MAX_BYTES } from "./store.js";

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const MAX_MEDIA_ID_CHARS = 200;
const MEDIA_ID_PATTERN = /^[\p{L}\p{N}._-]+$/u;
const MAX_MEDIA_BYTES = MEDIA_MAX_BYTES;

const isValidMediaId = (id: string) => {
  if (!id) {
    return false;
  }
  if (id.length > MAX_MEDIA_ID_CHARS) {
    return false;
  }
  if (id === "." || id === "..") {
    return false;
  }
  return MEDIA_ID_PATTERN.test(id);
};

export function attachMediaRoutes(
  app: Elysia,
  ttlMs = DEFAULT_TTL_MS,
  _runtime: RuntimeEnv = defaultRuntime,
) {
  const mediaDir = getMediaDir();

  app.get("/media/:id", async ({ params, set }) => {
    const id = params.id;
    if (!isValidMediaId(id)) {
      set.status = 400;
      return "invalid path";
    }
    try {
      const { handle, realPath, stat } = await openFileWithinRoot({
        rootDir: mediaDir,
        relativePath: id,
      });
      if (stat.size > MAX_MEDIA_BYTES) {
        await handle.close().catch(() => {});
        set.status = 413;
        return "too large";
      }
      if (Date.now() - stat.mtimeMs > ttlMs) {
        await handle.close().catch(() => {});
        await fs.rm(realPath).catch(() => {});
        set.status = 410;
        return "expired";
      }
      const data = await handle.readFile();
      await handle.close().catch(() => {});
      const mime = await detectMime({ buffer: data, filePath: realPath });
      if (mime) {
        set.headers["content-type"] = mime;
      }
      // best-effort single-use cleanup shortly after serving
      setTimeout(() => {
        fs.rm(realPath).catch(() => {});
      }, 50);
      return data;
    } catch (err) {
      if (err instanceof SafeOpenError) {
        if (err.code === "invalid-path") {
          set.status = 400;
          return "invalid path";
        }
        if (err.code === "not-found") {
          set.status = 404;
          return "not found";
        }
      }
      set.status = 404;
      return "not found";
    }
  });

  // periodic cleanup
  setInterval(() => {
    void cleanOldMedia(ttlMs);
  }, ttlMs).unref();
}

export async function startMediaServer(
  port: number,
  ttlMs = DEFAULT_TTL_MS,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<Server> {
  const app = new Elysia({ adapter: node() });
  attachMediaRoutes(app, ttlMs, runtime);
  return await new Promise((resolve, reject) => {
    app.listen(port, (serverInfo) => {
      const nodeServer = (serverInfo as { raw?: { node?: { server?: Server } } }).raw?.node?.server;
      if (nodeServer) {
        resolve(nodeServer);
      } else {
        reject(new Error("Failed to create HTTP server"));
      }
    });
  });
}
