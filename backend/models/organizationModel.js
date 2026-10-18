import { Schema, model, Types } from 'mongoose'

const organizationSchema = new Schema({

    name: {
        type: String,
        required: [true, "Organization name is required"],
        unique: true,
        trim: true
    },

    planId: {
        type: Types.ObjectId,
        ref: "plan",
        required: [true, "Plan ID is required"],
        index: true
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const organizationModel = model("organization", organizationSchema)