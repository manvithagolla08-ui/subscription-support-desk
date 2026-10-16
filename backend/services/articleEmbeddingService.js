
import { chunkModel } from "../models/chunkModel.js";
import { splitArticleIntoChunks } from "./chunkingService.js";
import { generateEmbedding } from "./embeddingService.js";

export async function generateArticleChunks(article) {
  if (!article?._id || typeof article.content !== "string") {
    throw new Error("A valid help article is required");
  }

  const chunks = await splitArticleIntoChunks(article.content);

  const embeddedChunks = [];

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.chunkText);

    embeddedChunks.push({
      articleId: article._id,
      chunkText: chunk.chunkText,
      chunkIndex: chunk.chunkIndex,
      embedding,
    });
  }

  return embeddedChunks;
}

export async function saveArticleChunks(article) {
  const embeddedChunks = await generateArticleChunks(article);

  await chunkModel.deleteMany({ articleId: article._id });

  if (embeddedChunks.length === 0) {
    return [];
  }

  return chunkModel.insertMany(embeddedChunks);
}

export async function deleteArticleChunks(articleId) {
  return chunkModel.deleteMany({ articleId });
}
