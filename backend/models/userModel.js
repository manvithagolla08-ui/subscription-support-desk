import { Schema, model } from "mongoose"

const userSchema = new Schema({

    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },

    email: {
        type: String,
        lowercase: true,
        required: [true, "Email is required"],
        unique: [true, "Email already exists"],
        trim: true
    },

    password: {
        type: String,
        required: [true, "There must be a password"]
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
        required: [true, "Role is required"],
        default: "CUSTOMER"
    }

}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

export const userModel = model("user", userSchema)