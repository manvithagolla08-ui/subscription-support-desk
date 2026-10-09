
import exp from 'express'
import { Types } from 'mongoose'
import { ticketModel } from '../models/ticketModel.js'
import { membershipModel } from '../models/membershipModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

export const ticketRouter = exp.Router()

const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED']
const validPriorities = ['LOW', 'MEDIUM', 'HIGH']


// CREATE TICKET
ticketRouter.post("/", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {
    try {
        let { organizationId, title, description, priority } = req.body

        // Validate request fields
        if (
            !organizationId ||
            !Types.ObjectId.isValid(organizationId) ||
            typeof title !== "string" ||
            !title.trim() ||
            typeof description !== "string" ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid organizationId, title and description are required"
            })
        }

        // Reject fields customers must not control
        let allowedFields = ['organizationId', 'title', 'description', 'priority']

        if (Object.keys(req.body).some(key => !allowedFields.includes(key))) {
            return res.status(400).json({
                success: false,
                message: "Invalid fields in request body"
            })
        }

        // Validate priority
        if (priority !== undefined && !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority"
            })
        }

        // Verify the customer belongs to the requested organization
        let membership = await membershipModel.findOne({
            userId: req.user.id,
            organizationId: organizationId,
            role: "CUSTOMER"
        })

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "You are not a customer of this organization"
            })
        }

        // Set protected fields on the server
        let ticketDocument = await ticketModel.create({
            organizationId: membership.organizationId,
            createdBy: req.user.id,
            title: title.trim(),
            description: description.trim(),
            priority: priority || "MEDIUM",
            status: "OPEN"
        })

        res.status(201).json({
            success: true,
            message: "ticket created successfully",
            data: ticketDocument
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to create ticket"
        })
    }
})


// GET ALL TICKETS CREATED BY THE CUSTOMER
ticketRouter.get("/", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {
    try {
        let customerId = req.user.id

        let tickets = await ticketModel.find({
            createdBy: customerId
        })

        res.status(200).json({
            success: true,
            message: tickets.length === 0 ? "no tickets found" : "customer tickets",
            data: tickets
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to fetch tickets"
        })
    }
})


// GET ONE TICKET CREATED BY THE CUSTOMER
ticketRouter.get("/:ticketId", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {
    try {
        let ticketId = req.params.ticketId

        if (!Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "invalid ticket ID"
            })
        }

        let ticket = await ticketModel.findById(ticketId)

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "ticket not found"
            })
        }

        if (ticket.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "you are not authorized to view this ticket"
            })
        }

        res.status(200).json({
            success: true,
            message: "ticket details",
            data: ticket
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to fetch ticket"
        })
    }
})


// UPDATE TICKET STATUS OR PRIORITY
ticketRouter.patch("/:ticketId", verifyToken, allowedRoles("SPECIALIST", "SUPERVISOR"), async (req, res) => {
    try {
        let ticketId = req.params.ticketId

        if (!Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "invalid ticket ID"
            })
        }

        let ticket = await ticketModel.findById(ticketId)

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "ticket not found"
            })
        }

        // Verify staff membership in this ticket's organization
        let membership = await membershipModel.findOne({
            userId: req.user.id,
            organizationId: ticket.organizationId,
            role: { $in: ["SPECIALIST", "SUPERVISOR"] }
        })

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "you are not authorized to update tickets in this organization"
            })
        }

        // Staff can update only status and priority
        let allowedFields = ['status', 'priority']
        let requestFields = Object.keys(req.body)

        if (
            requestFields.length === 0 ||
            requestFields.some(key => !allowedFields.includes(key))
        ) {
            return res.status(400).json({
                success: false,
                message: "Only status and priority can be updated"
            })
        }

        if (
            req.body.status !== undefined &&
            !validStatuses.includes(req.body.status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            })
        }

        if (
            req.body.priority !== undefined &&
            !validPriorities.includes(req.body.priority)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority"
            })
        }

        let updatedTicket = await ticketModel.findByIdAndUpdate(
            ticketId,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )

        res.status(200).json({
            success: true,
            message: "ticket updated successfully",
            data: updatedTicket
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to update ticket"
        })
    }
})