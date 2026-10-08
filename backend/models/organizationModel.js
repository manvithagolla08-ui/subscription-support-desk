import { Schema, model, Types } from 'mongoose'

const organizationSchema = new Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    planId: {
        type: Types.ObjectId,
        ref: "plan",
        required: true
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const organizationModel = model("organization", organizationSchema)