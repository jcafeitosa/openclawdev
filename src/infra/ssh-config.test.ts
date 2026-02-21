import { describe, expect, it, vi } from "vitest";

function createMockBunProc(params: { stdout: string; exitCode: number }) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(params.stdout));
      controller.close();
    },
  });
  return {
    stdout: stream as ReadableStream<Uint8Array> | number | null,
    exited: Promise.resolve(params.exitCode) as Promise<number | null>,
    kill: vi.fn() as (signal?: string | number) => void,
  };
}

describe("ssh-config", () => {
  it("parses ssh -G output", async () => {
    const { parseSshConfigOutput } = await import("./ssh-config.js");
    const parsed = parseSshConfigOutput(
      "user bob\nhostname example.com\nport 2222\nidentityfile none\nidentityfile /tmp/id\n",
    );
    expect(parsed.user).toBe("bob");
    expect(parsed.host).toBe("example.com");
    expect(parsed.port).toBe(2222);
    expect(parsed.identityFiles).toEqual(["/tmp/id"]);
  });

  it("resolves ssh config via ssh -G", async () => {
    const { resolveSshConfig } = await import("./ssh-config.js");
    const mockProc = createMockBunProc({
      stdout: [
        "user steipete",
        "hostname peters-mac-studio-1.sheep-coho.ts.net",
        "port 2222",
        "identityfile none",
        "identityfile /tmp/id_ed25519",
        "",
      ].join("\n"),
      exitCode: 0,
    });
    const spawnImpl = vi.fn(() => mockProc);
    const config = await resolveSshConfig({ user: "me", host: "alias", port: 22 }, {}, spawnImpl);
    expect(config?.user).toBe("steipete");
    expect(config?.host).toBe("peters-mac-studio-1.sheep-coho.ts.net");
    expect(config?.port).toBe(2222);
    expect(config?.identityFiles).toEqual(["/tmp/id_ed25519"]);
    const argv = spawnImpl.mock.calls[0]?.[0] as string[] | undefined;
    expect(argv?.slice(-2)).toEqual(["--", "me@alias"]);
  });

  it("returns null when ssh -G fails", async () => {
    const { resolveSshConfig } = await import("./ssh-config.js");
    const mockProc = createMockBunProc({ stdout: "", exitCode: 1 });
    const spawnImpl = vi.fn(() => mockProc);
    const config = await resolveSshConfig(
      { user: "me", host: "bad-host", port: 22 },
      {},
      spawnImpl,
    );
    expect(config).toBeNull();
  });
});
