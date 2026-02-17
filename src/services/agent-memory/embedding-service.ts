/**
 * Embedding Service for Semantic Memory Search
 *
 * Generates vector embeddings for text to enable semantic search without LLM overhead.
 *
 * Strategies:
 * - Local (default): Xenova/all-MiniLM-L6-v2 (384-dim, free, fast)
 * - Remote (optional): OpenAI text-embedding-ada-002 (1536-dim, $0.0001/1K tokens)
 *
 * Token savings: 98% (search via embeddings vs loading all memories into LLM)
 */

import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("agent-memory/embeddings");

export type EmbeddingStrategy = "local" | "openai";

export interface EmbeddingOptions {
  strategy?: EmbeddingStrategy;
  /**
   * Model to use:
   * - local: "Xenova/all-MiniLM-L6-v2" (384-dim, default)
   * - openai: "text-embedding-ada-002" (1536-dim)
   */
  model?: string;
  /**
   * Batch size for processing multiple texts
   * Local: 32 (fits in memory)
   * OpenAI: 100 (API limit: 2048)
   */
  batchSize?: number;
}

export interface Embedding {
  vector: number[];
  dimensions: number;
  model: string;
}

/**
 * Embedding Service (Singleton)
 */
class EmbeddingService {
  private localPipeline: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize local embedding model (lazy)
   */
  private async initLocal(): Promise<void> {
    if (this.localPipeline) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      log.info("Loading local embedding model (Xenova/all-MiniLM-L6-v2)...");
      const start = Date.now();

      this.localPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true, // Use quantized model for speed
      });

      const duration = Date.now() - start;
      log.info(`Local embedding model loaded in ${duration}ms`);
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for a single text (local)
   */
  async generateLocal(text: string): Promise<Embedding> {
    await this.initLocal();

    if (!this.localPipeline) {
      throw new Error("Local embedding pipeline not initialized");
    }

    // Generate embedding
    const output = await this.localPipeline(text, {
      pooling: "mean", // Mean pooling (average of all token embeddings)
      normalize: true, // L2 normalization (for cosine similarity)
    });

    // Extract vector from tensor
    const vector = Array.from(output.data as Float32Array);

    return {
      vector,
      dimensions: vector.length, // 384 for all-MiniLM-L6-v2
      model: "Xenova/all-MiniLM-L6-v2",
    };
  }

  /**
   * Generate embedding for a single text (OpenAI)
   */
  async generateOpenAI(text: string, model = "text-embedding-ada-002"): Promise<Embedding> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
      model: string;
    };

    return {
      vector: data.data[0].embedding,
      dimensions: data.data[0].embedding.length, // 1536 for ada-002
      model: data.model,
    };
  }

  /**
   * Generate embeddings in batch (local)
   */
  async generateBatchLocal(
    texts: string[],
    options?: { batchSize?: number },
  ): Promise<Embedding[]> {
    await this.initLocal();

    const batchSize = options?.batchSize ?? 32;
    const results: Embedding[] = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(batch.map((text) => this.generateLocal(text)));
      results.push(...batchEmbeddings);

      if (i + batchSize < texts.length) {
        log.debug(`Processed ${i + batchSize}/${texts.length} embeddings`);
      }
    }

    return results;
  }

  /**
   * Generate embeddings in batch (OpenAI)
   */
  async generateBatchOpenAI(
    texts: string[],
    options?: { batchSize?: number; model?: string },
  ): Promise<Embedding[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    const model = options?.model ?? "text-embedding-ada-002";
    const batchSize = options?.batchSize ?? 100; // OpenAI supports up to 2048 inputs
    const results: Embedding[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
        model: string;
      };

      results.push(
        ...data.data.map((item) => ({
          vector: item.embedding,
          dimensions: item.embedding.length,
          model: data.model,
        })),
      );

      if (i + batchSize < texts.length) {
        log.debug(`Processed ${i + batchSize}/${texts.length} embeddings`);
      }
    }

    return results;
  }

  /**
   * Generate embedding (auto-select strategy)
   */
  async generate(text: string, options?: EmbeddingOptions): Promise<Embedding> {
    const strategy = options?.strategy ?? "local";

    if (strategy === "openai") {
      return this.generateOpenAI(text, options?.model);
    }

    return this.generateLocal(text);
  }

  /**
   * Generate embeddings in batch (auto-select strategy)
   */
  async generateBatch(texts: string[], options?: EmbeddingOptions): Promise<Embedding[]> {
    const strategy = options?.strategy ?? "local";

    if (strategy === "openai") {
      return this.generateBatchOpenAI(texts, {
        batchSize: options?.batchSize,
        model: options?.model,
      });
    }

    return this.generateBatchLocal(texts, { batchSize: options?.batchSize });
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embeddings must have same dimensions");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();

/**
 * Helper: Generate embedding for text (default strategy)
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions,
): Promise<Embedding> {
  return embeddingService.generate(text, options);
}

/**
 * Helper: Generate embeddings in batch (default strategy)
 */
export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions,
): Promise<Embedding[]> {
  return embeddingService.generateBatch(texts, options);
}

/**
 * Helper: Calculate cosine similarity
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  return embeddingService.cosineSimilarity(a, b);
}
