
import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

import {
    createConversation,
    getConversations,
    getConversationById,
    addMessage
} from '../controllers/conversationController.js'

export const conversationRouter = exp.Router()

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
