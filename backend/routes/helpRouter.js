
import exp from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { helpArticleModel } from '../models/helpArticleModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import { searchRelevantChunks } from '../services/vectorSearchService.js'

export const helpRouter = exp.Router()

const execFileAsync = promisify(execFile)
const backendDirectory = fileURLToPath(new URL('..', import.meta.url))
const indexingScript = fileURLToPath(
    new URL('../scripts/indexHelpArticles.js', import.meta.url)
)

let indexingInProgress = false

// GET ALL PUBLISHED HELP ARTICLES
helpRouter.get("/", async (req, res) => {
    try {
        const articles = await helpArticleModel.find({
            status: "PUBLISHED"
        })

        if (articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "no published help articles found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "published help articles",
            data: articles
        })
    } catch (err) {
        console.error("Fetch help articles failed:", err)
        return res.status(500).json({
            success: false,
            message: "failed to fetch help articles"
        })
    }
})

// SEMANTIC SEARCH OVER PUBLISHED HELP ARTICLES
helpRouter.post("/search", async (req, res) => {
    try {
        const { query, limit } = req.body ?? {}

        if (
            typeof query !== "string" ||
            !query.trim() ||
            (limit !== undefined &&
                (!Number.isInteger(limit) || limit < 1 || limit > 20))
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a non-empty query and an optional integer limit between 1 and 20"
            })
        }

        const results = await searchRelevantChunks(
            query.trim(),
            limit ?? 5
        )

        return res.status(200).json({
            success: true,
            message: results.length
                ? "relevant help articles found"
                : "no relevant help articles found",
            data: results
        })
    } catch (err) {
        console.error("Help article search failed:", err)
        return res.status(500).json({
            success: false,
            message: "failed to search help articles"
        })
    }
})

// REINDEX PUBLISHED HELP ARTICLES
helpRouter.post(
    "/reindex",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        if (indexingInProgress) {
            return res.status(409).json({
                success: false,
                message: "help article indexing is already in progress"
            })
        }

        indexingInProgress = true

        try {
            const { stdout } = await execFileAsync(
                process.execPath,
                [indexingScript],
                {
                    cwd: backendDirectory,
                    timeout: 10 * 60 * 1000,
                    maxBuffer: 2 * 1024 * 1024
                }
            )

            return res.status(200).json({
                success: true,
                message: "help article indexing completed",
                output: stdout.trim()
            })
        } catch (err) {
            console.error("Help article reindexing failed:", err)

            return res.status(
                err.killed ? 504 : 500
            ).json({
                success: false,
                message: err.killed
                    ? "help article indexing timed out"
                    : "help article indexing failed",
                error: err.stderr?.trim() || err.message
            })
        } finally {
            indexingInProgress = false
        }
    }
)

// CREATE HELP ARTICLE DRAFT
helpRouter.post(
    "/drafts",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        try {
            const newArticle = {
                ...req.body,
                status: "DRAFT"
            }

            const articleDocument = await helpArticleModel.create(newArticle)

            return res.status(201).json({
                success: true,
                message: "help article draft created successfully",
                data: articleDocument
            })
        } catch (err) {
            console.error("Create help draft failed:", err)
            return res.status(400).json({
                success: false,
                message: "failed to create help article draft"
            })
        }
    }
)

// PUBLISH A HELP ARTICLE DRAFT
helpRouter.post(
    "/drafts/:articleId/publish",
    verifyToken,
    allowedRoles("KNOWLEDGE_MANAGER"),
    async (req, res) => {
        try {
            const article = await helpArticleModel.findById(
                req.params.articleId
            )

            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: "help article not found"
                })
            }

            if (article.status === "PUBLISHED") {
                return res.status(400).json({
                    success: false,
                    message: "help article is already published"
                })
            }

            const updatedArticle = await helpArticleModel.findByIdAndUpdate(
                req.params.articleId,
                { status: "PUBLISHED" },
                { new: true, runValidators: true }
            )

            return res.status(200).json({
                success: true,
                message: "help article published successfully",
                data: updatedArticle
            })
        } catch (err) {
            console.error("Publish help article failed:", err)
            return res.status(500).json({
                success: false,
                message: "failed to publish help article"
            })
        }
    }
)
