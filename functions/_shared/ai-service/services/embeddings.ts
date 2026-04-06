/**
 * Embeddings Service
 * 
 * Creates vector embeddings from text using configured provider.
 */

import { resolveFeatureRuntime } from "../config/settings";
import { getProvider, type EmbeddingOptions, type EmbeddingResponse } from "../providers";

/**
 * Create an embedding from text
 * 
 * @param userId - User ID
 * @param text - Text to embed
 * @param options - Embedding options
 * @returns Embedding vector
 */
export async function createEmbedding(
  userId: string,
  text: string,
  options?: Partial<EmbeddingOptions>
): Promise<EmbeddingResponse> {
  const runtime = await resolveFeatureRuntime(userId, "assistant_embeddings");
  const provider = getProvider(runtime.config.provider, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });
  
  // Check capability
  if (!provider.capabilities.embeddings || !provider.createEmbedding) {
    throw new Error(`Provider "${runtime.config.provider}" does not support embeddings`);
  }

  const { model: _ignoredModel, ...rest } = options || {};
  return provider.createEmbedding(text, {
    ...rest,
    model: runtime.config.model,
  });
}

/**
 * Create embeddings for multiple texts
 * 
 * @param userId - User ID
 * @param texts - Array of texts to embed
 * @returns Array of embeddings
 */
export async function createEmbeddings(
  userId: string,
  texts: string[]
): Promise<EmbeddingResponse[]> {
  return Promise.all(texts.map(text => createEmbedding(userId, text)));
}

/**
 * Calculate similarity between two embeddings (cosine similarity)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
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

/**
 * Find most similar embeddings
 */
export function findMostSimilar(
  query: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; similarity: number }> {
  const similarities = embeddings.map(({ id, embedding }) => ({
    id,
    similarity: cosineSimilarity(query, embedding),
  }));
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
