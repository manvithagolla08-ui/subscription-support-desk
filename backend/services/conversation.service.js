
import { Types } from 'mongoose'
import { conversationModel } from '../models/conversationModel.js'

// Retrieve conversation history for its owner
export async function getConversationHistory(conversationId, userId) {
    if (
        !Types.ObjectId.isValid(conversationId) ||
        !Types.ObjectId.isValid(userId)
    ) {
        const error = new Error('Invalid conversation ID or user ID')
        error.statusCode = 400
        throw error
    }

    const conversation = await conversationModel.findOne({
        _id: conversationId,
        userId: userId
    }).select('messages')

    if (!conversation) {
        const error = new Error('Conversation not found')
        error.statusCode = 404
        throw error
    }

    // Return only the history fields the AI needs
    return conversation.messages.map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
    }))
}

// Save an AI-generated response to an owned conversation
export async function saveAssistantMessage(
    conversationId,
    userId,
    content
) {
    if (
        !Types.ObjectId.isValid(conversationId) ||
        !Types.ObjectId.isValid(userId)
    ) {
        const error = new Error('Invalid conversation ID or user ID')
        error.statusCode = 400
        throw error
    }

    if (typeof content !== 'string' || !content.trim()) {
        const error = new Error('Assistant response must be non-empty')
        error.statusCode = 400
        throw error
    }

    const conversation = await conversationModel.findOne({
        _id: conversationId,
        userId: userId
    })

    if (!conversation) {
        const error = new Error('Conversation not found')
        error.statusCode = 404
        throw error
    }

    conversation.messages.push({
        role: 'assistant',
        content: content.trim()
    })

    await conversation.save()

    return conversation.messages[conversation.messages.length - 1]
}
