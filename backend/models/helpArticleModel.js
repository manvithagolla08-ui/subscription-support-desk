import mongoose from "mongoose"

const helpArticleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        content: {
            type: String,
            required: true,
            trim: true
        },

        version: {
            type: Number,
            required: true,
            default: 1
        },

        status: {
            type: String,
            enum: {values:["DRAFT", "PUBLISHED"],
                message:"invalid status"
            },
            default: "DRAFT"
        }
    },
    {
        timestamps: true,
    versionKey: false,
    strict: "throw"
    }
)

export const helpArticleModel = mongoose.model(
    "helpArticle",
    helpArticleSchema
)