
import exp from "express";

import { helpArticleModel } from "../models/helpArticleModel.js";
import { helpChunkModel } from "../models/helpChunkModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { allowedRoles } from "../middlewares/allowedRoles.js";
import { indexHelpArticle } from "../services/helpIndexingService.js";
import { searchRelevantChunks } from "../services/vectorSearchService.js";

export const helpRouter = exp.Router();

// Get all published help articles.
helpRouter.get("/", async (req, res) => {
    try {
        const articles = await helpArticleModel.find({
            status: "PUBLISHED",
        });

        if (articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No published help articles found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Published help articles.",
            data: articles,
        });
    } catch (error) {
        console.error("Fetching help articles failed:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch help articles.",
        });
    }
});

// Create an article, generate embeddings, and store its chunks.
// POST /api/help
helpRouter.post(
    "/",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        let article;

        try {
            const { title, content } = req.body;

            if (
                typeof title !== "string" ||
                !title.trim() ||
                typeof content !== "string" ||
                !content.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Title and content are required.",
                });
            }

            // Create an immediately published article.
            article = await helpArticleModel.create({
                title: title.trim(),
                content: content.trim(),
                status: "PUBLISHED",
            });

            // Split the content, generate embeddings, and save chunks.
            const chunkCount = await indexHelpArticle(article);

            return res.status(201).json({
                success: true,
                message: "Article created and indexed successfully.",
                data: {
                    articleId: article._id,
                    chunkCount,
                },
            });
        } catch (error) {
            console.error("Article ingestion failed:", error);

            // Best-effort cleanup if indexing fails.
            if (article) {
                try {
                    await helpChunkModel.deleteMany({
                        articleId: article._id,
                    });

                    await helpArticleModel.deleteOne({
                        _id: article._id,
                    });
                } catch (cleanupError) {
                    console.error(
                        "Article ingestion cleanup failed:",
                        cleanupError
                    );
                }
            }

            return res.status(500).json({
                success: false,
                message: "Failed to create and index the article.",
            });
        }
    }
);

// Search published help articles.
// POST /api/help/search
helpRouter.post("/search", async (req, res) => {
    try {
        const { query, limit } = req.body;

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "A non-empty search query is required.",
            });
        }

        const results = await searchRelevantChunks(
            query.trim(),
            limit ?? 5
        );

        return res.status(200).json({
            success: true,
            message: "Help search completed.",
            data: results,
        });
    } catch (error) {
        console.error("Help search failed:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search help articles.",
        });
    }
});

// Create a draft article.
// POST /api/help/drafts
helpRouter.post(
    "/drafts",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        try {
            const { title, content } = req.body;

            if (
                typeof title !== "string" ||
                !title.trim() ||
                typeof content !== "string" ||
                !content.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Title and content are required.",
                });
            }

            const article = await helpArticleModel.create({
                title: title.trim(),
                content: content.trim(),
                status: "DRAFT",
            });

            return res.status(201).json({
                success: true,
                message: "Help article draft created successfully.",
                data: article,
            });
        } catch (error) {
            console.error("Creating help article draft failed:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to create help article draft.",
            });
        }
    }
);

// Publish an existing draft.
// POST /api/help/drafts/:articleId/publish
helpRouter.post(
    "/drafts/:articleId/publish",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        let article;

        try {
            article = await helpArticleModel.findById(
                req.params.articleId
            );

            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: "Help article not found.",
                });
            }

            if (article.status === "PUBLISHED") {
                return res.status(400).json({
                    success: false,
                    message: "Help article is already published.",
                });
            }

            // Publish and persist the article.
            article.status = "PUBLISHED";
            await article.save();

            // Automatically index the newly published article.
            try {
                const chunkCount = await indexHelpArticle(article);

                return res.status(200).json({
                    success: true,
                    message: "Help article published and indexed successfully.",
                    data: {
                        article,
                        chunkCount,
                    },
                });
            } catch (indexError) {
                console.error(
                    "Article published, but indexing failed:",
                    indexError
                );

                return res.status(500).json({
                    success: false,
                    articlePublished: true,
                    message:
                        "Article was published, but indexing failed. Retry indexing before relying on search for this article.",
                    articleId: String(article._id),
                });
            }
        } catch (error) {
            console.error("Publishing help article failed:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to publish help article.",
            });
        }
    }
);
