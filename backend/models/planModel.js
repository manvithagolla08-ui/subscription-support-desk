import { Schema, model } from 'mongoose'

const planSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Plan name is required'],
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const planModel = model("plan", planSchema)
