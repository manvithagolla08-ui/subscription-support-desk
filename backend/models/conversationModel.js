
import { Schema, model, Types } from 'mongoose'

const messageSchema = new Schema({
    role: {
        type: String,
        enum: {
            values: ["user", "assistant"],
            message: "Invalid message role"
        },
        required: true
    },

    content: {
        type: String,
        required: true,
        trim: true
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    _id: true,
    versionKey: false,
    strict: "throw"
})

const conversationSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },

    title: {
        type: String,
        trim: true,
        default: "New conversation"
    },

    messages: {
        type: [messageSchema],
        default: []
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const conversationModel = model(
    "conversation",
    conversationSchema
)
