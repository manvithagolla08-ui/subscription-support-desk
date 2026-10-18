import { Schema, model, Types } from 'mongoose'

const membershipSchema = new Schema({

    userId: {
        type: Types.ObjectId,
        ref: "user",
        required: [true, "User ID is required"],
        index: true
    },

    organizationId: {
        type: Types.ObjectId,
        ref: "organization",
        required: [true, "Organization ID is required"],
        index: true
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
        required: [true, "Role is required"]
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

// Enforce unique membership per user per organization
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true })

export const membershipModel = model("membership", membershipSchema)