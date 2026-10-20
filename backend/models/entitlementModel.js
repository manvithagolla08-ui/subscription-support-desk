import { Schema, model, Types } from 'mongoose'

const entitlementSchema = new Schema({
    planId: {
        type: Types.ObjectId,
        ref: "plan",
        required: [true, 'Plan ID is required']
    },
    feature: {
        type: String,
        required: [true, 'Feature name is required'],
        trim: true,
    },
    allowed: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

// Prevent duplicate features per plan
entitlementSchema.index({ planId: 1, feature: 1 }, { unique: true });

export const entitlementModel = model("entitlement", entitlementSchema)
