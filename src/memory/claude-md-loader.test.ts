import { writeFileSync, mkdirSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadClaudeMdMemory, clearClaudeMdCache } from "./claude-md-loader.js";

describe("claude-md-loader", () => {
  let testDir: string;

  beforeEach(() => {
    clearClaudeMdCache();
    testDir = join(tmpdir(), `claude-md-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    clearClaudeMdCache();
    try {
      if (existsSync(testDir)) {
        // Clean up test files
        const files = ["CLAUDE.md", "CLAUDE.local.md", "subdir/CLAUDE.md"];
        for (const file of files) {
          const path = join(testDir, file);
          if (existsSync(path)) {
            unlinkSync(path);
          }
        }
        const subdirPath = join(testDir, "subdir");
        if (existsSync(subdirPath)) {
          rmdirSync(subdirPath);
        }
        rmdirSync(testDir);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it("returns null when no CLAUDE.md files exist", () => {
    const result = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });
    expect(result).toBeNull();
  });

  it("loads project-level CLAUDE.md", () => {
    const content = "# Project Memory\nThis is project-level memory.";
    writeFileSync(join(testDir, "CLAUDE.md"), content);

    const result = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });

    expect(result).toBeDefined();
    expect(result).toContain("# Project Memory");
    expect(result).toContain("This is project-level memory.");
  });

  it("loads local project memory (CLAUDE.local.md)", () => {
    const content = "# Local Project Memory\nThis is local memory.";
    writeFileSync(join(testDir, "CLAUDE.local.md"), content);

    const result = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });

    expect(result).toBeDefined();
    expect(result).toContain("# Local Project Memory");
    expect(result).toContain("This is local memory.");
  });

  it("combines multiple CLAUDE.md files with separators", () => {
    writeFileSync(join(testDir, "CLAUDE.md"), "# Project Memory\nProject content.");
    writeFileSync(join(testDir, "CLAUDE.local.md"), "# Local Project Memory\nLocal content.");

    const result = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });

    expect(result).toBeDefined();
    expect(result).toContain("---");
    expect(result).toContain("# Project Memory");
    expect(result).toContain("# Local Project Memory");
  });

  it("loads directory-specific memory walking up from currentDir", () => {
    const subdirPath = join(testDir, "subdir");
    mkdirSync(subdirPath, { recursive: true });

    writeFileSync(join(testDir, "CLAUDE.md"), "# Project Memory\nProject content.");
    writeFileSync(join(subdirPath, "CLAUDE.md"), "# Directory Memory\nSubdir content.");

    const result = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: subdirPath,
    });

    expect(result).toBeDefined();
    expect(result).toContain("# Directory Memory");
    expect(result).toContain("# Project Memory");
    expect(result).toContain("Subdir content.");
    expect(result).toContain("Project content.");
  });

  it("caches results based on file modification time", () => {
    const claudeMdPath = join(testDir, "CLAUDE.md");
    writeFileSync(claudeMdPath, "# Memory\nContent.");

    const result1 = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });

    // Call again without changing file - should return cached result
    const result2 = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });

    expect(result1).toEqual(result2);
  });

  it("detects file changes and invalidates cache", () => {
    const claudeMdPath = join(testDir, "CLAUDE.md");
    writeFileSync(claudeMdPath, "# Memory\nOriginal content.");

    const result1 = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });
    expect(result1).toContain("Original content.");

    // Modify the file
    writeFileSync(claudeMdPath, "# Memory\nUpdated content.");

    const result2 = loadClaudeMdMemory({
      workspaceDir: testDir,
      currentDir: testDir,
    });
    expect(result2).toContain("Updated content.");
    expect(result2).not.toContain("Original content.");
  });
});
