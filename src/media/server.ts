import fs from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { danger } from "../globals.js";
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

async function handleMediaRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ttlMs: number,
  _runtime: RuntimeEnv,
): Promise<void> {
  const mediaDir = getMediaDir();

  // Only accept GET requests for /media/:id
  const rawPath = req.url ?? "/";
  const match = rawPath.match(/^\/media\/(.+)$/);
  if (!match || req.method !== "GET") {
    res.statusCode = 404;
    res.end("not found");
    return;
  }

  let id: string;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    res.statusCode = 400;
    res.end("invalid path");
    return;
  }

  if (!isValidMediaId(id)) {
    res.statusCode = 400;
    res.end("invalid path");
    return;
  }

  try {
    const { handle, realPath, stat } = await openFileWithinRoot({
      rootDir: mediaDir,
      relativePath: id,
    });
    if (stat.size > MAX_MEDIA_BYTES) {
      await handle.close().catch(() => {});
      res.statusCode = 413;
      res.end("too large");
      return;
    }
    if (Date.now() - stat.mtimeMs > ttlMs) {
      await handle.close().catch(() => {});
      await fs.rm(realPath).catch(() => {});
      res.statusCode = 410;
      res.end("expired");
      return;
    }
    const data = await handle.readFile();
    await handle.close().catch(() => {});
    const mime = await detectMime({ buffer: data, filePath: realPath });
    if (mime) {
      res.setHeader("content-type", mime);
    }
    res.setHeader("content-length", data.length);
    res.statusCode = 200;
    res.end(data);
    // best-effort single-use cleanup after response ends
    res.on("finish", () => {
      const cleanup = () => {
        void fs.rm(realPath).catch(() => {});
      };
      // Tests should not pay for time-based cleanup delays.
      if (process.env.VITEST || process.env.NODE_ENV === "test") {
        queueMicrotask(cleanup);
        return;
      }
      setTimeout(cleanup, 50);
    });
  } catch (err) {
    if (err instanceof SafeOpenError) {
      if (err.code === "invalid-path") {
        res.statusCode = 400;
        res.end("invalid path");
        return;
      }
      if (err.code === "not-found") {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
    }
    res.statusCode = 404;
    res.end("not found");
  }
}

export async function startMediaServer(
  port: number,
  ttlMs = DEFAULT_TTL_MS,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<Server> {
  const server = createServer((req, res) => {
    void handleMediaRequest(req, res, ttlMs, runtime).catch((err) => {
      runtime.error(danger(`Media server error: ${String(err)}`));
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });
  });

  // periodic cleanup
  setInterval(() => {
    void cleanOldMedia(ttlMs);
  }, ttlMs).unref();

  return await new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1");
    server.once("listening", () => resolve(server));
    server.once("error", (err) => {
      runtime.error(danger(`Media server failed: ${String(err)}`));
      reject(err);
    });
  });
}
