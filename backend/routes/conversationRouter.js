
import exp from 'express'
import { Types } from 'mongoose'
import { conversationModel } from '../models/conversationModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

import { searchRelevantChunks } from '../services/vectorSearchService.js'
import { generateAIAnswer } from '../services/aiService.js'


export const conversationRouter = exp.Router()

// CREATE CONVERSATION
async function createConversation(req, res) {
    try {
        let { title } = req.body

        // Reject unexpected fields
        const allowedFields = ['title']

        if (Object.keys(req.body).some(
            key => !allowedFields.includes(key)
        )) {
            return res.status(400).json({
                success: false,
                message: "Invalid fields in request body"
            })
        }

        // Validate title if provided
        if (
            title !== undefined &&
            (typeof title !== "string" || !title.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Title must be a non-empty string"
            })
        }

        // Assign ownership to the logged-in customer
        const conversationDocument = await conversationModel.create({
            userId: req.user.id,
            title: title === undefined
                ? "New conversation"
                : title.trim(),
            messages: []
        })

        return res.status(201).json({
            success: true,
            message: "conversation created successfully",
            data: conversationDocument
        })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            success: false,
            message: "failed to create conversation"
        })
    }
}

// GET ALL CONVERSATIONS OF THE LOGGED-IN CUSTOMER
async function getConversations(req, res) {
    try {
        const conversations = await conversationModel.find({
            userId: req.user.id
        })
            .select('title messages createdAt updatedAt')
            .sort({ updatedAt: -1 })

        return res.status(200).json({
            success: true,
            message: conversations.length === 0
                ? "no conversations found"
                : "conversations fetched successfully",
            data: conversations
        })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            success: false,
            message: "failed to fetch conversations"
        })
    }
}

// GET ONE CONVERSATION OWNED BY THE LOGGED-IN CUSTOMER
async function getConversationById(req, res) {
    try {
        const conversationId = req.params.conversationId

        if (!Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "invalid conversation ID"
            })
        }

        const conversation = await conversationModel.findOne({
            _id: conversationId,
            userId: req.user.id
        })

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "conversation not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "conversation details fetched successfully",
            data: conversation
        })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            success: false,
            message: "failed to fetch conversation"
        })
    }
}

// ADD A USER MESSAGE TO AN EXISTING CONVERSATION

async function addMessage(req, res) {
    try {
        const conversationId = req.params.conversationId
        const { content } = req.body

        if (!Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "invalid conversation ID"
            })
        }

        if (
            !req.body ||
            Object.keys(req.body).length !== 1 ||
            typeof content !== "string" ||
            !content.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "A non-empty message content is required"
            })
        }

        // Find the conversation and enforce ownership
        const conversation = await conversationModel.findOne({
            _id: conversationId,
            userId: req.user.id
        })

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "conversation not found"
            })
        }

        const userMessage = content.trim()

        // Save the customer's message
        conversation.messages.push({
            role: "user",
            content: userMessage
        })

        await conversation.save()

        // Retrieve relevant published help article chunks
        const relevantChunks = await searchRelevantChunks(userMessage)

        // Build context for the AI
        const context = relevantChunks.length > 0
            ? relevantChunks.map((chunk, index) =>
                `Source ${index + 1}: ${chunk.source.title}
Version: ${chunk.source.version}
Content: ${chunk.chunkText}`
            ).join("\n\n")
            : "No relevant published help articles were found. Do not invent product information. Explain that you cannot confirm the answer from the available information."

        // Generate the AI response
        const answer = await generateAIAnswer(
    userMessage,
    context,
    req.user.id
)

        // Save the AI response in the same conversation
        conversation.messages.push({
            role: "assistant",
            content: answer
        })

        await conversation.save()

        return res.status(200).json({
            success: true,
            message: "AI response generated successfully",
            data: conversation
        })

    } catch (err) {
        console.error("AI conversation error:", err)

        return res.status(500).json({
            success: false,
            message: "Failed to generate the support response. Your message may already be saved."
        })
    }
}

// CREATE A CONVERSATION
conversationRouter.post(
    '/',
    verifyToken,
    allowedRoles("CUSTOMER"),
    createConversation
)

// GET ALL CONVERSATIONS OF THE LOGGED-IN CUSTOMER
conversationRouter.get(
    '/',
    verifyToken,
    allowedRoles("CUSTOMER"),
    getConversations
)

// GET ONE CONVERSATION
conversationRouter.get(
    '/:conversationId',
    verifyToken,
    allowedRoles("CUSTOMER"),
    getConversationById
)

// ADD A MESSAGE TO A CONVERSATION
conversationRouter.post(
    '/:conversationId/messages',
    verifyToken,
    allowedRoles("CUSTOMER"),
    addMessage
)
