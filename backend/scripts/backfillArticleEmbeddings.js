
import { config } from "dotenv";
import mongoose from "mongoose";
import { helpArticleModel } from "../models/helpArticleModel.js";
import { saveArticleChunks } from "../services/articleEmbeddingService.js";

config();

async function backfillPublishedArticles() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB.");

    const articles = await helpArticleModel.find({
      status: "PUBLISHED",
    });

    console.log(`Found ${articles.length} published articles.`);

    for (const article of articles) {
      console.log(`Processing: ${article.title}`);

      await saveArticleChunks(article);

      console.log(`Embedded successfully: ${article.title}`);
    }

    console.log("Backfill completed.");
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

backfillPublishedArticles();
