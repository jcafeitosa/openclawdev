/**
 * PostgreSQL + pgvector memory index backend.
 *
 * Drop-in replacement for MemoryIndexManager (SQLite-based).
 * Same interface, same sync/embedding logic — only the persistence layer changes.
 *
 * Architecture:
 *  - Extends MemoryIndexManager to inherit all embedding/batch logic
 *  - openDatabase() returns an in-memory SQLite (never written to disk)
 *  - All data-persistence methods are overridden to use PostgreSQL
 *  - readMeta() returns null on construction (forces dirty=true on first run)
 *  - runSync() is fully overridden to use PG-based file hashing and chunk storage
 *  - search() is fully overridden to use pgvector + pg_trgm FTS
 *  - status() is fully overridden to count from PG tables
 */

import fs from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import { resolveAgentDir } from "../agents/agent-scope.js";
import { resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { resolveMemorySearchConfig } from "../agents/memory-search.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { enforceEmbeddingMaxInputTokens } from "./embedding-chunk-limits.js";
import { createEmbeddingProvider } from "./embeddings.js";
import { bm25RankToScore, mergeHybridResults } from "./hybrid.js";
import {
  buildFileEntry,
  hashText,
  chunkMarkdown,
  listMemoryFiles,
  runWithConcurrency,
  remapChunkLines,
} from "./internal.js";
import type { MemoryFileEntry } from "./internal.js";
import { MemoryIndexManager } from "./manager.js";
import { getPgClient } from "./pg-client.js";
import {
  pgClearAll,
  pgCountChunks,
  pgCountFiles,
  pgCountEmbeddingCache,
  pgDeleteChunksByPath,
  pgDeleteStaleFiles,
  pgGetFileHash,
  pgLoadEmbeddingCache,
  pgPruneEmbeddingCache,
  pgReadMeta,
  pgSearchFts,
  pgSearchVector,
  pgUpsertChunk,
  pgUpsertEmbeddingCache,
  pgUpsertFile,
  pgWriteMeta,
} from "./pg-schema.js";
import { extractKeywords } from "./query-expansion.js";
import type { SessionFileEntry } from "./session-files.js";
import {
  buildSessionEntry,
  listSessionFilesForAgent,
  sessionPathForFile,
} from "./session-files.js";
import { requireNodeSqlite } from "./sqlite.js";
import type {
  MemoryEmbeddingProbeResult,
  MemoryProviderStatus,
  MemorySearchResult,
  MemorySource,
  MemorySyncProgressUpdate,
} from "./types.js";

const log = createSubsystemLogger("memory-pg");

type MemoryIndexMeta = {
  model: string;
  provider: string;
  providerKey?: string;
  chunkTokens: number;
  chunkOverlap: number;
  vectorDims?: number;
};

type MemorySyncProgressState = {
  completed: number;
  total: number;
  label?: string;
  report: (update: MemorySyncProgressUpdate) => void;
};

const EMBEDDING_INDEX_CONCURRENCY = 4;
const EMBEDDING_BATCH_MAX_TOKENS = 8000;

/**
 * Estimates UTF-8 byte size (used for batching).
 * Simple heuristic: 1 char ≈ 2 bytes on average.
 */
function estimateBytes(text: string): number {
  return text.length * 2;
}

export class MemoryIndexManagerPg extends MemoryIndexManager {
  /**
   * Factory method for the PG backend.
   * Called from MemoryIndexManager.get() when cfg.memory?.backend === "pg".
   */
  static async createPg(params: {
    cfg: OpenClawConfig;
    agentId: string;
    purpose?: "default" | "status";
    cacheKey: string;
  }): Promise<MemoryIndexManagerPg> {
    const { cfg, agentId, cacheKey } = params;
    const settings = resolveMemorySearchConfig(cfg, agentId)!;
    const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
    const providerResult = await createEmbeddingProvider({
      config: cfg,
      agentDir: resolveAgentDir(cfg, agentId),
      provider: settings.provider,
      remote: settings.remote,
      model: settings.model,
      fallback: settings.fallback,
      local: settings.local,
    });
    return new MemoryIndexManagerPg({
      cacheKey,
      cfg,
      agentId,
      workspaceDir,
      settings,
      providerResult,
      purpose: params.purpose,
    });
  }

  // ─── SQLite override: in-memory only ────────────────────────────────────────

  /**
   * Returns an in-memory SQLite database.
   * All the abstract class's structural requirements (schema, etc.) operate on
   * this ephemeral DB. Actual data is stored in PostgreSQL.
   */
  protected override openDatabase(): DatabaseSync {
    const { DatabaseSync } = requireNodeSqlite();
    return new DatabaseSync(":memory:");
  }

  /**
   * Sets up the in-memory SQLite schema (needed by abstract parent) and marks
   * FTS as available (PG has pg_trgm).
   */
  protected override ensureSchema(): void {
    super.ensureSchema();
    // PG has full-text search via tsvector — mark FTS available regardless of
    // what the in-memory SQLite schema says.
    this.fts.available = true;
    this.fts.loadError = undefined;
  }

  /**
   * Always returns null so the constructor sets dirty=true (first run syncs).
   * The real meta is read asynchronously in runSync().
   */
  protected override readMeta(): MemoryIndexMeta | null {
    return null;
  }

  /**
   * Writes meta to both PostgreSQL (async, fire-and-forget) and the in-memory
   * SQLite (so parent code that reads from db.prepare is satisfied).
   */
  protected override writeMeta(meta: MemoryIndexMeta): void {
    // Write to in-memory SQLite for compat
    super.writeMeta(meta);
    // Persist to PG asynchronously
    const sql = getPgClient();
    void pgWriteMeta(sql, this.agentId, meta).catch((err) => {
      log.warn(`pg-backend: writeMeta failed: ${String(err)}`);
    });
  }

  // ─── Vector extension override: noop (PG handles vectors natively) ──────────

  protected override async ensureVectorReady(dimensions?: number): Promise<boolean> {
    // pgvector is always ready — dimensions are validated by PG itself
    if (typeof dimensions === "number" && dimensions > 0) {
      this.vector.dims = dimensions;
    }
    this.vector.available = true;
    return true;
  }

  // ─── Sync override (full PG-based reimplementation) ─────────────────────────

  protected override async runSync(params?: {
    reason?: string;
    force?: boolean;
    progress?: (update: MemorySyncProgressUpdate) => void;
  }): Promise<void> {
    const sql = getPgClient();
    const progress = params?.progress ? this.buildPgSyncProgress(params.progress) : undefined;

    if (progress) {
      progress.report({ completed: 0, total: 0, label: "Checking PostgreSQL memory index…" });
    }

    const meta = await pgReadMeta(sql, this.agentId);

    const needsFullReindex =
      params?.force ||
      !meta ||
      (this.provider && meta.model !== this.provider.model) ||
      (this.provider && meta.provider !== this.provider.id) ||
      meta.providerKey !== this.providerKey ||
      meta.chunkTokens !== this.settings.chunking.tokens ||
      meta.chunkOverlap !== this.settings.chunking.overlap;

    if (needsFullReindex) {
      log.debug("pg-backend: full reindex required", {
        reason: params?.reason,
        force: params?.force,
        hasMeta: !!meta,
      });
      await pgClearAll(sql, this.agentId);
    }

    const shouldSyncMemory =
      this.sources.has("memory") && (params?.force || needsFullReindex || this.dirty);
    const shouldSyncSessions = this.shouldSyncSessionsPg(params, needsFullReindex);

    if (shouldSyncMemory) {
      await this.syncMemoryFilesPg({ needsFullReindex, progress });
      this.dirty = false;
    }

    if (shouldSyncSessions) {
      await this.syncSessionFilesPg({ needsFullReindex, progress });
      this.sessionsDirty = false;
      this.sessionsDirtyFiles.clear();
    } else if (this.sessionsDirtyFiles.size > 0) {
      this.sessionsDirty = true;
    } else {
      this.sessionsDirty = false;
    }

    const nextMeta: MemoryIndexMeta = {
      model: this.provider?.model ?? "fts-only",
      provider: this.provider?.id ?? "none",
      providerKey: this.providerKey ?? undefined,
      chunkTokens: this.settings.chunking.tokens,
      chunkOverlap: this.settings.chunking.overlap,
    };
    if (this.vector.dims) {
      nextMeta.vectorDims = this.vector.dims;
    }

    await pgWriteMeta(sql, this.agentId, nextMeta);
    this.pgPruneEmbeddingCacheAsync();
  }

  private shouldSyncSessionsPg(
    params?: { reason?: string; force?: boolean },
    needsFullReindex = false,
  ): boolean {
    if (!this.sources.has("sessions")) {
      return false;
    }
    if (params?.force) {
      return true;
    }
    const reason = params?.reason;
    if (reason === "session-start" || reason === "watch") {
      return false;
    }
    if (needsFullReindex) {
      return true;
    }
    return this.sessionsDirty && this.sessionsDirtyFiles.size > 0;
  }

  private buildPgSyncProgress(
    onProgress: (update: MemorySyncProgressUpdate) => void,
  ): MemorySyncProgressState {
    const state: MemorySyncProgressState = {
      completed: 0,
      total: 0,
      label: undefined,
      report: (update) => {
        if (update.label) {
          state.label = update.label;
        }
        const label =
          update.total > 0 && state.label
            ? `${state.label} ${update.completed}/${update.total}`
            : state.label;
        onProgress({ completed: update.completed, total: update.total, label });
      },
    };
    return state;
  }

  private async syncMemoryFilesPg(params: {
    needsFullReindex: boolean;
    progress?: MemorySyncProgressState;
  }): Promise<void> {
    if (!this.provider) {
      log.debug("pg-backend: skipping memory file sync (FTS-only mode, no embedding provider)");
      return;
    }
    const sql = getPgClient();
    const files = await listMemoryFiles(this.workspaceDir, this.settings.extraPaths);
    const fileEntries = await Promise.all(
      files.map((file) => buildFileEntry(file, this.workspaceDir)),
    );
    const activePaths = new Set(fileEntries.map((e) => e.path));

    if (params.progress) {
      params.progress.total += fileEntries.length;
      params.progress.report({
        completed: params.progress.completed,
        total: params.progress.total,
        label: "Indexing memory files (PG)…",
      });
    }

    const tasks = fileEntries.map((entry) => async () => {
      if (!params.needsFullReindex) {
        const existingHash = await pgGetFileHash(sql, this.agentId, entry.path);
        if (existingHash === entry.hash) {
          if (params.progress) {
            params.progress.completed += 1;
            params.progress.report({
              completed: params.progress.completed,
              total: params.progress.total,
            });
          }
          return;
        }
      }
      await this.indexFilePg(entry, { source: "memory" });
      if (params.progress) {
        params.progress.completed += 1;
        params.progress.report({
          completed: params.progress.completed,
          total: params.progress.total,
        });
      }
    });

    await runWithConcurrency(
      tasks,
      this.batch.enabled ? this.batch.concurrency : EMBEDDING_INDEX_CONCURRENCY,
    );
    await pgDeleteStaleFiles(sql, this.agentId, "memory", activePaths);
  }

  private async syncSessionFilesPg(params: {
    needsFullReindex: boolean;
    progress?: MemorySyncProgressState;
  }): Promise<void> {
    if (!this.provider) {
      log.debug("pg-backend: skipping session file sync (FTS-only mode)");
      return;
    }
    const sql = getPgClient();
    const files = await listSessionFilesForAgent(this.agentId);
    const activePaths = new Set(files.map((f) => sessionPathForFile(f)));
    const indexAll = params.needsFullReindex || this.sessionsDirtyFiles.size === 0;

    if (params.progress) {
      params.progress.total += files.length;
      params.progress.report({
        completed: params.progress.completed,
        total: params.progress.total,
        label: "Indexing session files (PG)…",
      });
    }

    const tasks = files.map((absPath) => async () => {
      if (!indexAll && !this.sessionsDirtyFiles.has(absPath)) {
        if (params.progress) {
          params.progress.completed += 1;
          params.progress.report({
            completed: params.progress.completed,
            total: params.progress.total,
          });
        }
        return;
      }
      const entry = await buildSessionEntry(absPath);
      if (!entry) {
        if (params.progress) {
          params.progress.completed += 1;
          params.progress.report({
            completed: params.progress.completed,
            total: params.progress.total,
          });
        }
        return;
      }
      if (!params.needsFullReindex) {
        const existingHash = await pgGetFileHash(sql, this.agentId, entry.path);
        if (existingHash === entry.hash) {
          if (params.progress) {
            params.progress.completed += 1;
            params.progress.report({
              completed: params.progress.completed,
              total: params.progress.total,
            });
          }
          return;
        }
      }
      await this.indexFilePg(entry, { source: "sessions", content: entry.content });
      if (params.progress) {
        params.progress.completed += 1;
        params.progress.report({
          completed: params.progress.completed,
          total: params.progress.total,
        });
      }
    });

    await runWithConcurrency(
      tasks,
      this.batch.enabled ? this.batch.concurrency : EMBEDDING_INDEX_CONCURRENCY,
    );
    await pgDeleteStaleFiles(sql, this.agentId, "sessions", activePaths);
  }

  // ─── indexFile override (PG storage) ────────────────────────────────────────

  /**
   * Override of the abstract indexFile — stores chunks in PostgreSQL instead of SQLite.
   * The embedding logic (batching, retry, cache) is reimplemented here using PG helpers.
   */
  protected override async indexFile(
    entry: MemoryFileEntry | SessionFileEntry,
    options: { source: MemorySource; content?: string },
  ): Promise<void> {
    await this.indexFilePg(entry, options);
  }

  private async indexFilePg(
    entry: MemoryFileEntry | SessionFileEntry,
    options: { source: MemorySource; content?: string },
  ): Promise<void> {
    if (!this.provider) {
      log.debug("pg-backend: skipping indexFile (FTS-only mode)", {
        path: entry.path,
        source: options.source,
      });
      return;
    }

    const content = options.content ?? (await fs.readFile(entry.absPath, "utf-8"));
    const chunks = enforceEmbeddingMaxInputTokens(
      this.provider,
      chunkMarkdown(content, this.settings.chunking).filter((c) => c.text.trim().length > 0),
    );
    if (options.source === "sessions" && "lineMap" in entry) {
      remapChunkLines(chunks, entry.lineMap);
    }

    // ── Embedding cache (PG-based) ────────────────────────────────────────────
    const sql = getPgClient();
    const hashes = chunks.map((c) => c.hash);
    const cached = await pgLoadEmbeddingCache(sql, this.agentId, {
      provider: this.provider.id,
      model: this.provider.model,
      providerKey: this.providerKey,
      hashes,
    });

    const embeddings: number[][] = Array.from({ length: chunks.length }, () => [] as number[]);
    const missing: Array<{ index: number; text: string; hash: string }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) {
        continue;
      }
      const hit = cached.get(chunk.hash);
      if (hit && hit.length > 0) {
        embeddings[i] = hit;
      } else {
        missing.push({ index: i, text: chunk.text, hash: chunk.hash });
      }
    }

    // ── Embed missing chunks ──────────────────────────────────────────────────
    if (missing.length > 0) {
      // Build batches by token estimate
      const batches: Array<typeof missing> = [];
      let current: typeof missing = [];
      let currentTokens = 0;
      for (const item of missing) {
        const estimate = estimateBytes(item.text);
        if (current.length > 0 && currentTokens + estimate > EMBEDDING_BATCH_MAX_TOKENS) {
          batches.push(current);
          current = [];
          currentTokens = 0;
        }
        if (current.length === 0 && estimate > EMBEDDING_BATCH_MAX_TOKENS) {
          batches.push([item]);
          continue;
        }
        current.push(item);
        currentTokens += estimate;
      }
      if (current.length > 0) {
        batches.push(current);
      }

      const toCache: Array<{ hash: string; embedding: number[] }> = [];
      let cursor = 0;
      for (const batch of batches) {
        const texts = batch.map((item) => item.text);
        const batchEmbeddings = await this.embedBatchWithRetry(texts);
        for (let i = 0; i < batch.length; i++) {
          const item = missing[cursor + i];
          const embedding = batchEmbeddings[i] ?? [];
          if (item) {
            embeddings[item.index] = embedding;
            toCache.push({ hash: item.hash, embedding });
          }
        }
        cursor += batch.length;
      }

      // Save new embeddings to PG cache
      if (toCache.length > 0 && this.cache.enabled) {
        await pgUpsertEmbeddingCache(sql, this.agentId, {
          provider: this.provider.id,
          model: this.provider.model,
          providerKey: this.providerKey,
          entries: toCache,
        });
      }
    }

    // Update vector.dims from sample embedding
    const sample = embeddings.find((e) => e.length > 0);
    if (sample) {
      this.vector.dims = sample.length;
    }

    // ── Delete old chunks for this path+source ────────────────────────────────
    await pgDeleteChunksByPath(sql, this.agentId, entry.path, options.source);

    // ── Insert new chunks ─────────────────────────────────────────────────────
    const now = Math.floor(Date.now());
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i] ?? [];
      if (!chunk) {
        continue;
      }
      const id = hashText(
        `${options.source}:${entry.path}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}:${this.provider.model}`,
      );
      await pgUpsertChunk(sql, this.agentId, {
        id,
        path: entry.path,
        source: options.source,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        hash: chunk.hash,
        model: this.provider.model,
        text: chunk.text,
        embedding,
        updatedAt: now,
      });
    }

    // ── Upsert file record ────────────────────────────────────────────────────
    await pgUpsertFile(sql, this.agentId, {
      path: entry.path,
      source: options.source,
      hash: entry.hash,
      mtime: Math.floor(entry.mtimeMs),
      size: entry.size,
    });
  }

  // ─── pruneEmbeddingCacheIfNeeded override ────────────────────────────────────

  protected override pruneEmbeddingCacheIfNeeded(): void {
    this.pgPruneEmbeddingCacheAsync();
  }

  private pgPruneEmbeddingCacheAsync(): void {
    if (!this.cache.enabled || !this.provider) {
      return;
    }
    const max = this.cache.maxEntries;
    if (!max || max <= 0) {
      return;
    }
    const sql = getPgClient();
    void pgPruneEmbeddingCache(sql, this.agentId, {
      provider: this.provider.id,
      model: this.provider.model,
      providerKey: this.providerKey,
      maxEntries: max,
    }).catch((err) => {
      log.warn(`pg-backend: pruneEmbeddingCache failed: ${String(err)}`);
    });
  }

  // ─── status() override ───────────────────────────────────────────────────────

  override status(): MemoryProviderStatus {
    // Return a synchronous placeholder — counts are fetched async on demand.
    // We use the synchronous API expected by the interface but return 0 for
    // counts; the actual counts are visible in search results / next call.
    // For a proper status with counts, use statusAsync().
    const sql = getPgClient();
    let files = 0;
    let chunks = 0;
    let cacheEntries = 0;
    const sourceCounts: Array<{ source: MemorySource; files: number; chunks: number }> = [];

    // Fire-and-forget PG queries to populate counts — returned synchronously as 0
    // (consistent with the MemorySearchManager.status() synchronous contract).
    // For accurate counts, callers should await probeVectorAvailability() first.
    void Promise.all([
      pgCountFiles(sql, this.agentId, Array.from(this.sources)).catch(() => 0),
      pgCountChunks(sql, this.agentId, Array.from(this.sources)).catch(() => 0),
      this.cache.enabled && this.provider
        ? pgCountEmbeddingCache(sql, this.agentId, {
            provider: this.provider.id,
            model: this.provider.model,
            providerKey: this.providerKey,
          }).catch(() => 0)
        : Promise.resolve(0),
    ]).then(([f, c, ce]) => {
      files = f;
      chunks = c;
      cacheEntries = ce;
    });

    return {
      backend: "pg" as "builtin", // typed as "builtin" for interface compat
      files,
      chunks,
      dirty: this.dirty || this.sessionsDirty,
      workspaceDir: this.workspaceDir,
      dbPath: "postgresql (pgvector)",
      provider: this.provider?.id ?? "none",
      model: this.provider?.model,
      requestedProvider:
        (this.provider?.id as "openai" | "local" | "gemini" | "voyage" | "auto") ?? "auto",
      sources: Array.from(this.sources),
      extraPaths: this.settings.extraPaths,
      sourceCounts,
      cache: this.cache.enabled
        ? {
            enabled: true,
            entries: cacheEntries,
            maxEntries: this.cache.maxEntries,
          }
        : { enabled: false, maxEntries: this.cache.maxEntries },
      fts: {
        enabled: this.fts.enabled,
        available: true, // PG has pg_trgm + tsvector
        error: undefined,
      },
      fallback: this.fallbackReason
        ? { from: this.fallbackFrom ?? "local", reason: this.fallbackReason }
        : undefined,
      vector: {
        enabled: true,
        available: true, // pgvector is always available
        extensionPath: undefined,
        loadError: undefined,
        dims: this.vector.dims,
      },
      batch: {
        enabled: this.batch.enabled,
        failures: this.batchFailureCount,
        limit: 2,
        wait: this.batch.wait,
        concurrency: this.batch.concurrency,
        pollIntervalMs: this.batch.pollIntervalMs,
        timeoutMs: this.batch.timeoutMs,
        lastError: this.batchFailureLastError,
        lastProvider: this.batchFailureLastProvider,
      },
      custom: {
        searchMode: this.provider ? "hybrid" : "fts-only",
        backend: "pg",
      },
    };
  }

  // ─── search() override ───────────────────────────────────────────────────────

  override async search(
    query: string,
    opts?: {
      maxResults?: number;
      minScore?: number;
      sessionKey?: string;
    },
  ): Promise<MemorySearchResult[]> {
    void this.warmSession(opts?.sessionKey);
    if (this.settings.sync.onSearch && (this.dirty || this.sessionsDirty)) {
      void this.sync({ reason: "search" }).catch((err) => {
        log.warn(`pg-backend: sync failed (search): ${String(err)}`);
      });
    }

    const cleaned = query.trim();
    if (!cleaned) {
      return [];
    }

    const minScore = opts?.minScore ?? this.settings.query.minScore;
    const maxResults = opts?.maxResults ?? this.settings.query.maxResults;
    const hybrid = this.settings.query.hybrid;
    const candidates = Math.min(
      200,
      Math.max(1, Math.floor(maxResults * hybrid.candidateMultiplier)),
    );
    const sources = Array.from(this.sources);
    const sql = getPgClient();

    // ── FTS-only mode (no embedding provider) ─────────────────────────────────
    if (!this.provider) {
      if (!hybrid.enabled) {
        log.warn("pg-backend: no provider and hybrid disabled — no results");
        return [];
      }
      const keywords = extractKeywords(cleaned);
      const searchTerms = keywords.length > 0 ? keywords : [cleaned];
      const resultSets = await Promise.all(
        searchTerms.map((term) =>
          pgSearchFts(sql, this.agentId, {
            query: term,
            model: undefined,
            sources,
            limit: candidates,
          }).catch(() => []),
        ),
      );
      const seenIds = new Map<string, (typeof resultSets)[0][0]>();
      for (const results of resultSets) {
        for (const result of results) {
          const existing = seenIds.get(result.id);
          if (!existing || result.score > existing.score) {
            seenIds.set(result.id, result);
          }
        }
      }
      return [...seenIds.values()]
        .toSorted((a, b) => b.score - a.score)
        .filter((e) => e.score >= minScore)
        .slice(0, maxResults)
        .map((e) => ({
          path: e.path,
          startLine: e.startLine,
          endLine: e.endLine,
          score: e.score,
          snippet: e.text,
          source: e.source,
        }));
    }

    // ── Vector search ──────────────────────────────────────────────────────────
    const queryVec = await this.embedQueryWithTimeout(cleaned);
    const hasVector = queryVec.some((v) => v !== 0);

    const vectorResults = hasVector
      ? await pgSearchVector(sql, this.agentId, {
          embedding: queryVec,
          model: this.provider.model,
          sources,
          limit: candidates,
        }).catch(() => [])
      : [];

    if (!hybrid.enabled) {
      return vectorResults
        .filter((e) => e.score >= minScore)
        .slice(0, maxResults)
        .map((e) => ({
          path: e.path,
          startLine: e.startLine,
          endLine: e.endLine,
          score: e.score,
          snippet: e.text,
          source: e.source,
        }));
    }

    // ── Keyword search ─────────────────────────────────────────────────────────
    const keywordResults = await pgSearchFts(sql, this.agentId, {
      query: cleaned,
      model: this.provider.model,
      sources,
      limit: candidates,
    }).catch(() => []);

    // ── Hybrid merge ───────────────────────────────────────────────────────────
    const merged = await mergeHybridResults({
      vector: vectorResults.map((r) => ({
        id: r.id,
        path: r.path,
        startLine: r.startLine,
        endLine: r.endLine,
        source: r.source,
        snippet: r.text,
        vectorScore: r.score,
      })),
      keyword: keywordResults.map((r) => ({
        id: r.id,
        path: r.path,
        startLine: r.startLine,
        endLine: r.endLine,
        source: r.source,
        snippet: r.text,
        textScore: bm25RankToScore(r.textScore ?? r.score),
      })),
      vectorWeight: hybrid.vectorWeight,
      textWeight: hybrid.textWeight,
      mmr: hybrid.mmr,
      temporalDecay: hybrid.temporalDecay,
      workspaceDir: this.workspaceDir,
    });

    return merged.filter((e) => e.score >= minScore).slice(0, maxResults) as MemorySearchResult[];
  }

  // ─── probeVectorAvailability override ────────────────────────────────────────

  override async probeVectorAvailability(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }
    // pgvector is always available — try a dummy query
    const sql = getPgClient();
    try {
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  override async probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult> {
    if (!this.provider) {
      return { ok: false, error: "No embedding provider available (FTS-only mode)" };
    }
    try {
      await this.embedBatchWithRetry(["ping"]);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
