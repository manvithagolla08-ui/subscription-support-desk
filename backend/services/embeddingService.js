
import { OllamaEmbeddings } from "@langchain/ollama";

const embeddingModel = new OllamaEmbeddings({
  model: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

export async function generateEmbedding(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text must be a non-empty string");
  }

  const embedding = await embeddingModel.embedQuery(text.trim());

  if (
    !Array.isArray(embedding) ||
    embedding.length !== 2560 ||
    !embedding.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new Error(
      "Invalid embedding returned. Expected 2560 finite numbers."
    );
  }

  return embedding;
}

export async function generateQueryEmbedding(query) {
  return generateEmbedding(query);
}
