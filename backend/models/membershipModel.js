import { Schema, model, Types } from 'mongoose'

const membershipSchema = new Schema({

    userId: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },

    organizationId: {
        type: Types.ObjectId,
        ref: "organization",
        required: true
    },

    role: {
        type: String,
        enum: {
            values: [
                "CUSTOMER",
                "SPECIALIST",
                "KNOWLEDGE_MANAGER",
                "SUPERVISOR"
            ],
            message: "Invalid role"
        },
        required: true
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const membershipModel = model("membership", membershipSchema)