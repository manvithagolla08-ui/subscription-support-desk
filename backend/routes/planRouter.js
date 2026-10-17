import exp from 'express'
import { planModel } from '../models/planModel.js'

export const planRouter = exp.Router()

// Create a plan
planRouter.post('/', async (req, res) => {
    try {
        const { name, description } = req.body
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Plan name is required' })
        }
        
        const plan = await planModel.create({ name, description })
        res.status(201).json({ success: true, message: "Plan created successfully", data: plan })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Plan already exists' })
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message })
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

// View a single plan by ID
planRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid plan ID' })
        }
        const plan = await planModel.findById(id)
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' })
        }
        res.status(200).json({ success: true, message: "Plan retrieved successfully", data: plan })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
})
