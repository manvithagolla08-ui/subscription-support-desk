
import exp from 'express'
import { Types } from 'mongoose'
import { organizationModel } from '../models/organizationModel.js'
import { membershipModel } from '../models/membershipModel.js'
import { planModel } from '../models/planModel.js'
import { userModel } from '../models/userModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

export const organizationRouter = exp.Router()

const validRoles = ['CUSTOMER', 'SPECIALIST', 'KNOWLEDGE_MANAGER', 'SUPERVISOR']


// Check whether a user is a supervisor of the given organization
async function isOrgSupervisor(userId, organizationId) {
    let membership = await membershipModel.findOne({
        userId: userId,
        organizationId: organizationId,
        role: "SUPERVISOR"
    })

    return membership != null
}


// CREATE ORGANIZATION (creator becomes its supervisor)
organizationRouter.post("/", verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        let { name, planId } = req.body

        // Reject unexpected fields
        let allowedFields = ['name', 'planId']

        if (Object.keys(req.body).some(key => !allowedFields.includes(key))) {
            return res.status(400).json({
                success: false,
                message: "Invalid fields in request body"
            })
        }

        if (
            typeof name !== "string" ||
            !name.trim() ||
            !planId ||
            !Types.ObjectId.isValid(planId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid name and planId are required"
            })
        }

        // Verify the plan exists
        let plan = await planModel.findById(planId)

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "plan not found"
            })
        }

        let organization = await organizationModel.create({
            name: name.trim(),
            planId: planId
        })

        // Add the creator as supervisor so the organization can be managed
        try {
            await membershipModel.create({
                userId: req.user.id,
                organizationId: organization._id,
                role: "SUPERVISOR"
            })
        } catch (err) {
            await organizationModel.findByIdAndDelete(organization._id)
            throw err
        }

        res.status(201).json({
            success: true,
            message: "organization created successfully",
            data: organization
        })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "organization name already exists"
            })
        }

        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to create organization"
        })
    }
})


// GET MEMBERSHIPS OF THE LOGGED-IN USER
organizationRouter.get("/mine", verifyToken, async (req, res) => {
    try {
        let memberships = await membershipModel.find({
            userId: req.user.id
        }).populate({
            path: "organizationId",
            select: "name planId",
            populate: { path: "planId", select: "name description" }
        })

        res.status(200).json({
            success: true,
            message: memberships.length === 0 ? "no memberships found" : "your memberships",
            data: memberships
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to fetch memberships"
        })
    }
})


// GET ONE ORGANIZATION (members only)
organizationRouter.get("/:orgId", verifyToken, async (req, res) => {
    try {
        let orgId = req.params.orgId

        if (!Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({
                success: false,
                message: "invalid organization ID"
            })
        }

        let organization = await organizationModel.findById(orgId).populate("planId", "name description")

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "organization not found"
            })
        }

        let membership = await membershipModel.findOne({
            userId: req.user.id,
            organizationId: orgId
        })

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "you are not a member of this organization"
            })
        }

        res.status(200).json({
            success: true,
            message: "organization details",
            data: organization
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to fetch organization"
        })
    }
})


// GET MEMBERS OF AN ORGANIZATION (its supervisors only)
organizationRouter.get("/:orgId/members", verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        let orgId = req.params.orgId

        if (!Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({
                success: false,
                message: "invalid organization ID"
            })
        }

        let organization = await organizationModel.findById(orgId)

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "organization not found"
            })
        }

        if (!(await isOrgSupervisor(req.user.id, orgId))) {
            return res.status(403).json({
                success: false,
                message: "you are not authorized to view members of this organization"
            })
        }

        let memberships = await membershipModel.find({
            organizationId: orgId
        }).populate("userId", "name email role")

        res.status(200).json({
            success: true,
            message: "organization members",
            data: memberships
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to fetch members"
        })
    }
})


// ASSIGN A USER TO AN ORGANIZATION (its supervisors only)
organizationRouter.post("/:orgId/members", verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        let orgId = req.params.orgId
        let { userId, role } = req.body

        if (!Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({
                success: false,
                message: "invalid organization ID"
            })
        }

        // Reject unexpected fields
        let allowedFields = ['userId', 'role']

        if (Object.keys(req.body).some(key => !allowedFields.includes(key))) {
            return res.status(400).json({
                success: false,
                message: "Invalid fields in request body"
            })
        }

        if (!userId || !Types.ObjectId.isValid(userId) || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Valid userId and role are required"
            })
        }

        let organization = await organizationModel.findById(orgId)

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "organization not found"
            })
        }

        if (!(await isOrgSupervisor(req.user.id, orgId))) {
            return res.status(403).json({
                success: false,
                message: "you are not authorized to manage members of this organization"
            })
        }

        let user = await userModel.findById(userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            })
        }

        // Route checks use the account role, so the membership role must match it
        if (user.role !== role) {
            return res.status(400).json({
                success: false,
                message: "role must match the user's account role"
            })
        }

        let existingMembership = await membershipModel.findOne({
            userId: userId,
            organizationId: orgId
        })

        if (existingMembership) {
            return res.status(409).json({
                success: false,
                message: "user is already a member of this organization"
            })
        }

        let membership = await membershipModel.create({
            userId: userId,
            organizationId: orgId,
            role: role
        })

        res.status(201).json({
            success: true,
            message: "member added successfully",
            data: membership
        })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "user is already a member of this organization"
            })
        }

        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to add member"
        })
    }
})


// REMOVE A MEMBERSHIP (its organization's supervisors only)
organizationRouter.delete("/:orgId/members/:membershipId", verifyToken, allowedRoles("SUPERVISOR"), async (req, res) => {
    try {
        let { orgId, membershipId } = req.params

        if (!Types.ObjectId.isValid(orgId) || !Types.ObjectId.isValid(membershipId)) {
            return res.status(400).json({
                success: false,
                message: "invalid organization or membership ID"
            })
        }

        let organization = await organizationModel.findById(orgId)

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "organization not found"
            })
        }

        if (!(await isOrgSupervisor(req.user.id, orgId))) {
            return res.status(403).json({
                success: false,
                message: "you are not authorized to manage members of this organization"
            })
        }

        // Membership must belong to the organization in the URL
        let membership = await membershipModel.findOne({
            _id: membershipId,
            organizationId: orgId
        })

        if (!membership) {
            return res.status(404).json({
                success: false,
                message: "membership not found"
            })
        }

        // Prevent supervisors from locking themselves out
        if (membership.userId.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "you cannot remove your own membership"
            })
        }

        await membershipModel.findByIdAndDelete(membershipId)

        res.status(200).json({
            success: true,
            message: "member removed successfully"
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "failed to remove member"
        })
    }
})
