import exp from 'express'
import { helpArticleModel } from '../models/helpArticleModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

export const helpRouter = exp.Router()


helpRouter.get("/help", async (req, res) => {

    let articles = await helpArticleModel.find({
        status: "PUBLISHED"
    })

    if (articles.length == 0) {
        return res.status(404).json({
            success: false,
            message: "no published help articles found"
        })
    }

    res.status(200).json({
        success: true,
        message: "published help articles",
        data: articles
    })
})


helpRouter.post("/help-drafts", verifyToken, allowedRoles("KNOWLEDGE_MANAGER"), async (req, res) => {

    let newArticle = req.body

    newArticle.status = "DRAFT"

    let articleDocument = await helpArticleModel.create(newArticle)

    // send response
    res.status(201).json({
        success: true,
        message: "help article draft created successfully",
        data: articleDocument
    })
})



helpRouter.post("/help-drafts/:articleId/publish", verifyToken, allowedRoles("KNOWLEDGE_MANAGER"), async (req, res) => {

    let article = await helpArticleModel.findById(req.params.articleId)

    // check whether article exists
    if (article == null) {
        return res.status(404).json({
            success: false,
            message: "help article not found"
        })
    }

    if (article.status == "PUBLISHED") {
        return res.status(400).json({
            success: false,
            message: "help article is already published"
        })
    }

    
    let updatedArticle = await helpArticleModel.findByIdAndUpdate(
        req.params.articleId,
        {
            status: "PUBLISHED"
        },
        {
            new: true,
            runValidators: true
        }
    )

    res.status(200).json({
        success: true,
        message: "help article published successfully",
        data: updatedArticle
    })
})