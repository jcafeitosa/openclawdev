import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getChildLogger } from "../../logging.js";
import { HooksFileSchema, type HookConfig, type HookAction } from "./types.js";

const log = getChildLogger({ module: "hook-runner" });

export class HookRunner {
  private hooks: HookConfig[] = [];
  private loaded = false;

  async loadHooks(cwd: string = process.cwd()) {
    const configPaths = [
      path.join(os.homedir(), ".openclaw", "hooks.json"),
      path.join(cwd, ".hooks.json"),
      path.join(cwd, "hooks.json"),
    ];

    for (const p of configPaths) {
      if (await this.fileExists(p)) {
        try {
          const content = await fs.readFile(p, "utf-8");
          const json = JSON.parse(content);
          const parsed = HooksFileSchema.parse(json);
          this.hooks.push(...parsed.hooks);
        } catch (error) {
          log.warn(
            `Failed to load hooks from ${p}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    this.loaded = true;
  }

  async runHooks(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ action: HookAction; message?: string }> {
    if (!this.loaded) {
      await this.loadHooks();
    }

    for (const hook of this.hooks) {
      if (this.matches(hook, toolName, args)) {
        if (hook.command) {
          try {
            if (typeof Bun !== "undefined") {
              const proc = Bun.spawn(["sh", "-c", hook.command], {
                stdout: "pipe",
                stderr: "pipe",
              });
              await proc.exited;
            }
          } catch (e) {
            log.error(
              `Hook command failed: ${hook.command} ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        if (hook.action === "deny" || hook.action === "ask") {
          return { action: hook.action, message: hook.message };
        }
      }
    }

    return { action: "allow" };
  }

  private matches(hook: HookConfig, toolName: string, args: Record<string, unknown>): boolean {
    if (hook.matcher.tool) {
      const toolRegex = new RegExp(hook.matcher.tool);
      if (!toolRegex.test(toolName)) {
        return false;
      }
    }

    if (hook.matcher.args) {
      for (const [key, pattern] of Object.entries(hook.matcher.args)) {
        const val = args?.[key];
        if (val === undefined) {
          return false;
        }
        const argRegex = new RegExp(
          typeof pattern === "string" ? pattern : JSON.stringify(pattern),
        );
        if (!argRegex.test(typeof val === "string" ? val : JSON.stringify(val))) {
          return false;
        }
      }
    }

    return true;
  }

  private async fileExists(p: string) {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}
