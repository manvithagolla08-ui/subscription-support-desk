import exp from 'express'
import { isValidObjectId } from 'mongoose'
import { entitlementModel } from '../models/entitlementModel.js'
import { planModel } from '../models/planModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

export const entitlementRouter = exp.Router()

// Add entitlement to a plan - Supervisor only
entitlementRouter.post('/', verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        const { planId, feature, allowed } = req.body

        if (!planId || !feature || typeof feature !== 'string' || !feature.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Plan ID and feature are required'
            })
        }

        if (!isValidObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID'
            })
        }

        if (typeof allowed !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Allowed must be a boolean'
            })
        }

        const plan = await planModel.findById(planId)

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            })
        }

        const entitlement = await entitlementModel.create({
            planId,
            feature: feature.trim(),
            allowed
        })

        res.status(201).json({
            success: true,
            message: "Entitlement created successfully",
            data: entitlement
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Feature already exists for this plan'
            })
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message
            })
        }

        console.error('Create entitlement error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

// View entitlements - Authenticated users
entitlementRouter.get('/', verifyToken, async (req, res) => {
    try {
        const planId = req.query.planId

        if (planId && !isValidObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID'
            })
        }

        const filter = planId ? { planId } : {}
        const entitlements = await entitlementModel.find(filter).populate('planId', 'name')

        if (entitlements.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No entitlements found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Entitlements retrieved successfully",
            data: entitlements
        })
    } catch (error) {
        console.error('Get entitlements error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

// View entitlements for a specific plan
entitlementRouter.get('/plan/:planId', verifyToken, async (req, res) => {
    try {
        const { planId } = req.params

        if (!isValidObjectId(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID'
            })
        }

        const plan = await planModel.findById(planId)

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            })
        }

        const entitlements = await entitlementModel.find({ planId }).populate('planId', 'name')

        if (entitlements.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No entitlements found for this plan"
            })
        }

        res.status(200).json({
            success: true,
            message: "Entitlements retrieved successfully",
            data: entitlements
        })
    } catch (error) {
        console.error('Get plan entitlements error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})

// View a single entitlement by ID
entitlementRouter.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entitlement ID'
            })
        }

        const entitlement = await entitlementModel.findById(id).populate('planId', 'name')

        if (!entitlement) {
            return res.status(404).json({
                success: false,
                message: 'Entitlement not found'
            })
        }

        res.status(200).json({
            success: true,
            message: "Entitlement retrieved successfully",
            data: entitlement
        })
    } catch (error) {
        console.error('Get entitlement error:', error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
})
