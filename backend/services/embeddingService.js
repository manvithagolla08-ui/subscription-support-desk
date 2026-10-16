
import { OllamaEmbeddings } from "@langchain/ollama";

const embeddingModel = new OllamaEmbeddings({
  model: "qwen3-embedding:4b",
  baseUrl: "http://localhost:11434",
});

export async function generateEmbedding(text) {
  if (typeof text !== "string" || text.trim() === "") {
    const error = new Error("Text must be a non-empty string");
    error.statusCode = 400;
    throw error;
  }

  const embedding = await embeddingModel.embedQuery(text.trim());

  if (
    !Array.isArray(embedding) ||
    embedding.length === 0 ||
    !embedding.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new Error("Ollama returned an invalid embedding vector");
  }

  return embedding;
}

export async function generateQueryEmbedding(query) {
  return generateEmbedding(query);
}
