import exp from 'express'
import { entitlementModel } from '../models/entitlementModel.js'

export const entitlementRouter = exp.Router()

// Add entitlement to a plan
entitlementRouter.post('/', async (req, res) => {
    try {
        const entitlement = await entitlementModel.create(req.body)
        res.status(201).json({ success: true, message: "Entitlement created successfully", data: entitlement })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Feature already exists for this plan' })
        }
        res.status(400).json({ success: false, message: error.message })
    }
})

// View entitlements
entitlementRouter.get('/', async (req, res) => {
    try {
        const filter = req.query.planId ? { planId: req.query.planId } : {}
        const entitlements = await entitlementModel.find(filter).populate('planId', 'name')
        if (entitlements.length === 0) {
            return res.status(404).json({ success: false, message: "No entitlements found" })
        }
        res.status(200).json({ success: true, message: "Entitlements retrieved successfully", data: entitlements })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})
