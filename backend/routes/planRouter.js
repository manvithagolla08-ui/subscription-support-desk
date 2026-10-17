import exp from 'express'
import { planModel } from '../models/planModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

export const planRouter = exp.Router()

// Create a plan - Supervisor only
planRouter.post('/', verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        const { name, description } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Plan name is required'
            })
        }

        const plan = await planModel.create({
            name: name.trim(),
            description
        })

        res.status(201).json({
            success: true,
            message: "Plan created successfully",
            data: plan
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Plan already exists'
            })
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message
            })
        }

        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// View all plans - Authenticated users
planRouter.get('/', verifyToken, async (req, res) => {
    try {
        const plans = await planModel.find({})

        if (plans.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No plans found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Plans retrieved successfully",
            data: plans
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// View a single plan by ID - Authenticated users
planRouter.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan ID'
            })
        }

        const plan = await planModel.findById(id)

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            })
        }

        res.status(200).json({
            success: true,
            message: "Plan retrieved successfully",
            data: plan
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})
