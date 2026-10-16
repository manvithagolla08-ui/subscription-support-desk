
import exp from "express";
import mongoose from "mongoose";
import { helpArticleModel } from "../models/helpArticleModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { allowedRoles } from "../middlewares/allowedRoles.js";
import {
  saveArticleChunks,
  deleteArticleChunks,
} from "../services/articleEmbeddingService.js";
import { searchHelpArticles } from "../services/vectorSearchService.js";

export const helpRouter = exp.Router();

// GET semantic search results for published help articles
helpRouter.get("/search", async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (typeof q !== "string" || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search query using ?q=",
      });
    }

    const results = await searchHelpArticles(q, limit ?? 5);

    return res.status(200).json({
      success: true,
      message: "semantic search completed",
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// GET all published help articles
helpRouter.get("/", async (req, res, next) => {
  try {
    const articles = await helpArticleModel.find({
      status: "PUBLISHED",
    });

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "no published help articles found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "published help articles",
      data: articles,
    });
  } catch (error) {
    next(error);
  }
});

// CREATE a help article draft
helpRouter.post(
  "/drafts",
  verifyToken,
  allowedRoles("KNOWLEDGE_MANAGER"),
  async (req, res, next) => {
    try {
      const { title, content, version } = req.body;

      const articleDocument = await helpArticleModel.create({
        title,
        content,
        version,
        status: "DRAFT",
      });

      return res.status(201).json({
        success: true,
        message: "help article draft created successfully",
        data: articleDocument,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUBLISH a draft after generating and saving its chunks
helpRouter.post(
  "/drafts/:articleId/publish",
  verifyToken,
  allowedRoles("KNOWLEDGE_MANAGER"),
  async (req, res, next) => {
    const articleId = req.params.articleId;

    try {
      if (!mongoose.isValidObjectId(articleId)) {
        return res.status(400).json({
          success: false,
          message: "invalid help article ID",
        });
      }

      const article = await helpArticleModel.findById(articleId);

      if (!article) {
        return res.status(404).json({
          success: false,
          message: "help article not found",
        });
      }

      if (article.status === "PUBLISHED") {
        return res.status(400).json({
          success: false,
          message: "help article is already published",
        });
      }

      // Generate embeddings and save chunks before publishing.
      await saveArticleChunks(article);

      article.status = "PUBLISHED";
      await article.save();

      return res.status(200).json({
        success: true,
        message: "help article published and embeddings generated successfully",
        data: article,
      });
    } catch (error) {
      // Best-effort cleanup if publishing fails.
      try {
        const currentArticle = await helpArticleModel.findById(articleId);

        if (currentArticle && currentArticle.status !== "PUBLISHED") {
          await deleteArticleChunks(articleId);
        }
      } catch (cleanupError) {
        console.error("Chunk cleanup failed:", cleanupError.message);
      }

      next(error);
    }
  }
);
