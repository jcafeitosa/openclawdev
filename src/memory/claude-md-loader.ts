/**
 * CLAUDE.md memory file loader.
 * Loads persistent memory instructions from hierarchical CLAUDE.md files,
 * similar to Claude Code CLI memory system.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";

type CachedMemory = {
  content: string;
  mtimeMs: number;
  path: string;
};

const cache = new Map<string, CachedMemory>();

function tryReadFile(filePath: string): { content: string; mtimeMs: number } | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const stat = statSync(filePath);
    const cached = cache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return { content: cached.content, mtimeMs: cached.mtimeMs };
    }
    const content = readFileSync(filePath, "utf-8").trim();
    if (!content) {
      return null;
    }
    cache.set(filePath, { content, mtimeMs: stat.mtimeMs, path: filePath });
    return { content, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

function collectDirectoryMemory(currentDir: string, workspaceRoot: string): string[] {
  const segments: string[] = [];
  let dir = resolve(currentDir);
  const root = resolve(workspaceRoot);

  // Walk up from currentDir to workspaceRoot
  while (dir.startsWith(root) && dir !== root) {
    const file = tryReadFile(join(dir, "CLAUDE.md"));
    if (file) {
      segments.unshift(file.content);
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return segments;
}

export function loadClaudeMdMemory(params: {
  workspaceDir?: string;
  currentDir?: string;
}): string | null {
  const sections: string[] = [];

  // 1. Global user memory
  const globalPath = join(homedir(), ".openclaw", "CLAUDE.md");
  const global = tryReadFile(globalPath);
  if (global) {
    sections.push(`# Global Memory\n${global.content}`);
  }

  // 2. Project memory
  if (params.workspaceDir) {
    const projectPath = join(params.workspaceDir, "CLAUDE.md");
    const project = tryReadFile(projectPath);
    if (project) {
      sections.push(`# Project Memory\n${project.content}`);
    }

    // 3. Local project memory (gitignored)
    const localPath = join(params.workspaceDir, "CLAUDE.local.md");
    const local = tryReadFile(localPath);
    if (local) {
      sections.push(`# Local Project Memory\n${local.content}`);
    }

    // 4. Directory-specific memory (walk up from currentDir)
    if (params.currentDir && params.currentDir !== params.workspaceDir) {
      const dirMemory = collectDirectoryMemory(params.currentDir, params.workspaceDir);
      if (dirMemory.length > 0) {
        sections.push(`# Directory Memory\n${dirMemory.join("\n\n")}`);
      }
    }
  }

  if (sections.length === 0) {
    return null;
  }
  return sections.join("\n\n---\n\n");
}

export function clearClaudeMdCache(): void {
  cache.clear();
}
