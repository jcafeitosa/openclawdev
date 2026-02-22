import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mocks must be declared before the imports that use them
vi.mock("../config/config.js", () => ({ loadConfig: vi.fn() }));
vi.mock("./auth.js", () => ({ isLocalDirectRequest: vi.fn() }));

import * as configModule from "../config/config.js";
import * as authModule from "./auth.js";
import { controlUiRouter } from "./routes/control-ui.js";

function makeUiRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-control-ui-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<html><head></head><body>ok</body></html>\n");
  return dir;
}

async function makeRequest(
  port: number,
  urlPath: string,
): Promise<{ status: number; location: string | null; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: urlPath, method: "GET" },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers["location"] ?? null,
            body,
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("controlUiRouter (tokenized redirect)", () => {
  let root: string;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    root = makeUiRoot();
    const app = express();
    app.use(controlUiRouter({ basePath: "", root: { kind: "resolved", path: root } }));
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function setupLocalRequest(token: string) {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      gateway: { auth: { token }, trustedProxies: [] },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);
    vi.mocked(authModule.isLocalDirectRequest).mockReturnValue(true);
  }

  it("redirects local root requests to a tokenized URL", async () => {
    setupLocalRequest("abc123");

    const res = await makeRequest(port, "/");

    expect(res.status).toBe(302);
    expect(res.location).toBe("/?token=abc123");
  });

  it("redirects local deep links to a tokenized URL", async () => {
    setupLocalRequest("abc123");

    const res = await makeRequest(port, "/hierarchy");

    expect(res.status).toBe(302);
    expect(res.location).toBe("/hierarchy?token=abc123");
  });

  it("does not redirect when token is already present", async () => {
    setupLocalRequest("abc123");

    const res = await makeRequest(port, "/?token=abc123");

    expect(res.status).toBe(200);
    expect(res.body).toContain("__OPENCLAW_CONTROL_UI_BASE_PATH__");
  });

  it("does not redirect non-local requests", async () => {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      gateway: { auth: { token: "abc123" }, trustedProxies: [] },
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any);
    vi.mocked(authModule.isLocalDirectRequest).mockReturnValue(false);

    const res = await makeRequest(port, "/");

    expect(res.status).toBe(200);
    expect(res.body).toContain("__OPENCLAW_CONTROL_UI_BASE_PATH__");
  });
});
