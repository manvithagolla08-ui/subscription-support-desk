import exp from 'express'
import { planModel } from '../models/planModel.js'

export const planRouter = exp.Router()

// Create a plan
planRouter.post('/', async (req, res) => {
    try {
        const plan = await planModel.create(req.body)
        res.status(201).json({ success: true, message: "Plan created successfully", data: plan })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Plan already exists' })
        }
        res.status(400).json({ success: false, message: error.message })
    }
})

// View plans
planRouter.get('/', async (req, res) => {
    try {
        const plans = await planModel.find({})
        if (plans.length === 0) {
            return res.status(404).json({ success: false, message: "No plans found" })
        }
        res.status(200).json({ success: true, message: "Plans retrieved successfully", data: plans })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})
