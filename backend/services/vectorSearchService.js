
import { helpChunkModel } from "../models/helpChunkModel.js";
import { helpArticleModel } from "../models/helpArticleModel.js";
import { generateQueryEmbedding } from "./embeddingService.js";

const VECTOR_INDEX_NAME = "article_vector_index";

export async function searchRelevantChunks(query, limit = 5) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Search query must not be empty");
  }

  const parsedLimit = Number(limit);
  const resultLimit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 20))
    : 5;

  const queryVector = await generateQueryEmbedding(query.trim());

  const chunks = await helpChunkModel.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(100, resultLimit * 20),
        limit: resultLimit,
      },
    },
    {
      $project: {
        articleId: 1,
        chunkText: 1,
        chunkIndex: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  if (chunks.length === 0) {
    return [];
  }

  const articleIds = [
    ...new Set(chunks.map((chunk) => String(chunk.articleId))),
  ];

  const articles = await helpArticleModel
    .find({
      _id: { $in: articleIds },
      status: "PUBLISHED",
    })
    .select("title version status");

  const articleMap = new Map(
    articles.map((article) => [String(article._id), article])
  );

  return chunks
    .filter((chunk) => articleMap.has(String(chunk.articleId)))
    .map((chunk) => {
      const article = articleMap.get(String(chunk.articleId));

      return {
        chunkText: chunk.chunkText,
        chunkIndex: chunk.chunkIndex,
        score: chunk.score,
        source: {
          articleId: article._id,
          title: article.title,
          version: article.version,
        },
      };
    });
}
