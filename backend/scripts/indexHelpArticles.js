
import "dotenv/config";
import mongoose from "mongoose";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { helpArticleModel } from "../models/helpArticleModel.js";
import { helpChunkModel } from "../models/helpChunkModel.js";
import { generateEmbedding } from "../services/embeddingService.js";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
});

async function indexHelpArticles() {
  try {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL is missing from backend/.env");
    }

    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB.");

    const articles = await helpArticleModel.find({
      status: "PUBLISHED",
    });

    console.log(`Found ${articles.length} published help articles.`);

    for (const article of articles) {
      console.log(`Indexing: ${article.title}`);

      const chunks = await textSplitter.splitText(article.content);

      const embeddedChunks = [];

      for (const [chunkIndex, chunkText] of chunks.entries()) {
        const embedding = await generateEmbedding(chunkText);

        embeddedChunks.push({
          articleId: article._id,
          chunkText,
          chunkIndex,
          embedding,
        });
      }

      // Replace existing chunks only after generating all embeddings.
      if (embeddedChunks.length > 0) {
        await helpChunkModel.bulkWrite(
          embeddedChunks.map((chunk) => ({
            updateOne: {
              filter: {
                articleId: chunk.articleId,
                chunkIndex: chunk.chunkIndex,
              },
              update: { $set: chunk },
              upsert: true,
            },
          }))
        );
      }

      // Remove stale chunks if the article became shorter.
      await helpChunkModel.deleteMany({
        articleId: article._id,
        chunkIndex: { $gte: embeddedChunks.length },
      });

      console.log(
        `Indexed ${embeddedChunks.length} chunks for "${article.title}".`
      );
    }

    console.log("Help article indexing completed.");
  } catch (error) {
    console.error("Help article indexing failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

indexHelpArticles();
