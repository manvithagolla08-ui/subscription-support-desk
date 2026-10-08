import { Schema, model, Types } from 'mongoose'

const ticketSchema = new Schema({

    organizationId: {
        type: Types.ObjectId,
        ref: "organization",
        required: true
    },

    createdBy: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    status: {
        type: String,
        enum: {
            values: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'],
            message: "Invalid status"
        },
        default: "OPEN"
    },

    priority: {
        type: String,
        enum: {
            values: ['LOW', 'MEDIUM', 'HIGH'],
            message: "Invalid priority"
        },
        default: "MEDIUM"
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const ticketModel = model("ticket", ticketSchema)