import exp from 'express'
import { ticketModel } from '../models/ticketModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'
export const ticketRouter = exp.Router()
ticketRouter.post("/tickets", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {

    let newTicket = req.body
    newTicket.createdBy = req.user.id
    let ticketDocument = await ticketModel.create(newTicket)
    res.status(201).json({
        success: true,
        message: "ticket created successfully",
        data: ticketDocument
    })
})

ticketRouter.get("/tickets", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {

    let customerId = req.user.id
    let tickets = await ticketModel.find({
        createdBy: customerId
    })
    if (tickets.length == 0) {
        return res.status(404).json({
            success: false,
            message: "no tickets found"
        })
    }
    res.status(200).json({
        success: true,
        message: "customer tickets",
        data: tickets
    })
})


ticketRouter.get("/tickets/:ticketId", verifyToken, allowedRoles("CUSTOMER"), async (req, res) => {

    let ticketId = req.params.ticketId
    let ticket = await ticketModel.findById(ticketId)

    if (ticket == null) {
        return res.status(404).json({
            success: false,
            message: "ticket not found"
        })
    }

    if (ticket.createdBy.toString() != req.user.id) {
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
})

ticketRouter.patch("/tickets/:ticketId", verifyToken, allowedRoles("SUPPORT_SPECIALIST", "SUPPORT_SUPERVISOR"), async (req, res) => {

    let ticket = await ticketModel.findById(req.params.ticketId)
    if (ticket == null) {
        return res.status(404).json({
            success: false,
            message: "ticket not found"
        })
    }

    let updatedTicket = await ticketModel.findByIdAndUpdate(
        req.params.ticketId,
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
})