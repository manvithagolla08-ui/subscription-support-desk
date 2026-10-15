import { conversationModel } from '../models/conversationModel.js'
import { Types } from 'mongoose'

// CREATE CONVERSATION
export async function createConversation(req, res) {
    try {
        // Get the title from the request body
        let { title } = req.body

        // Reject unexpected fields
        let allowedFields = ['title']

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

        // Create a conversation owned by the logged-in user
        let conversationDocument = await conversationModel.create({
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

// GET ALL CONVERSATIONS OF THE LOGGED-IN USER
export async function getConversations(req, res) {
    try {
        let conversations = await conversationModel.find({
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

// GET ONE CONVERSATION OWNED BY THE LOGGED-IN USER
export async function getConversationById(req, res) {
    try {
        let conversationId = req.params.conversationId

        // Validate the conversation ID
        if (!Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "invalid conversation ID"
            })
        }

        // Find the conversation and enforce ownership
        let conversation = await conversationModel.findOne({
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

// ADD A MESSAGE TO AN EXISTING CONVERSATION
export async function addMessage(req, res) {
    try {
        let conversationId = req.params.conversationId
        let { content } = req.body

        // Validate conversation ID
        if (!Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "invalid conversation ID"
            })
        }

        // Validate request body
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

        // Find the conversation and verify ownership
        let conversation = await conversationModel.findOne({
            _id: conversationId,
            userId: req.user.id
        })

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "conversation not found"
            })
        }

        // Store the customer's message
        conversation.messages.push({
            role: "user",
            content: content.trim(),
            timestamp: new Date()
        })

        // Save the updated conversation
        await conversation.save()

        return res.status(200).json({
            success: true,
            message: "message added successfully",
            data: conversation
        })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            success: false,
            message: "failed to add message"
        })
    }
}
