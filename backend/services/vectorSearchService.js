
import { chunkModel } from "../models/chunkModel.js";
import { helpArticleModel } from "../models/helpArticleModel.js";
import { generateQueryEmbedding } from "./embeddingService.js";

const VECTOR_INDEX_NAME = "article_vector_index";
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export async function searchHelpArticles(query, limit = DEFAULT_LIMIT) {
  if (typeof query !== "string" || !query.trim()) {
    const error = new Error("Search query must not be empty");
    error.statusCode = 400;
    throw error;
  }

  const parsedLimit = Number(limit);
  const resultLimit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, MAX_LIMIT))
    : DEFAULT_LIMIT;

  const queryVector = await generateQueryEmbedding(query.trim());

  const results = await chunkModel.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(100, resultLimit * 20),
        limit: MAX_LIMIT,
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

  if (results.length === 0) {
    return [];
  }

  const articleIds = [
    ...new Set(results.map((result) => String(result.articleId))),
  ];

  const publishedArticles = await helpArticleModel
    .find({
      _id: { $in: articleIds },
      status: "PUBLISHED",
    })
    .select("title version status");

  const articleMap = new Map(
    publishedArticles.map((article) => [
      String(article._id),
      article,
    ])
  );

  return results
    .filter((result) => articleMap.has(String(result.articleId)))
    .slice(0, resultLimit)
    .map((result) => {
      const article = articleMap.get(String(result.articleId));

      return {
        articleId: article._id,
        title: article.title,
        version: article.version,
        chunkText: result.chunkText,
        chunkIndex: result.chunkIndex,
        score: result.score,
      };
    });
}
