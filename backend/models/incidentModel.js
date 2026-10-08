import { Schema, model } from "mongoose"

const incidentSchema = new Schema({

    feature: {
        type: String,
        required: true,
        trim: true
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
        required: true,
        enum: {
            values: ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"],
            message: "Invalid status"
        },
        default: "INVESTIGATING"
    }

}, {
    timestamps: true,
    versionKey: false,
    strict: "throw"
})

export const incidentModel = model("incident", incidentSchema)