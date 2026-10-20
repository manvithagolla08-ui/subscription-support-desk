import exp from 'express';
import { Types } from 'mongoose';

import { organizationModel } from '../models/organizationModel.js';
import { membershipModel } from '../models/membershipModel.js';
import { planModel } from '../models/planModel.js';
import { userModel } from '../models/userModel.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { allowedRoles } from '../middlewares/allowedRoles.js';

export const organizationRouter = exp.Router();

const validRoles = [
    'CUSTOMER',
    'SPECIALIST',
    'KNOWLEDGE_MANAGER',
    'SUPERVISOR'
];

// Check whether the logged-in user has the Supervisor account role.
async function isOrgSupervisor(userId, organizationId) {
    const user = await userModel.findById(userId).select('role');

    if (user?.role !== 'SUPERVISOR') {
        return false;
    }

    // Confirm the Supervisor has a membership in this organization.
    const membership = await membershipModel.findOne({
        userId,
        organizationId,
        role: 'SUPERVISOR'
    });

    return Boolean(membership);
}


// CREATE ORGANIZATION
// The creator becomes a Supervisor member of the organization.
organizationRouter.post(
    '/',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const { name, planId } = req.body;

            const allowedFields = ['name', 'planId'];

            if (
                Object.keys(req.body).some(
                    key => !allowedFields.includes(key)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fields in request body'
                });
            }

            if (
                typeof name !== 'string' ||
                !name.trim() ||
                !planId ||
                !Types.ObjectId.isValid(planId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid name and planId are required'
                });
            }

            const plan = await planModel.findById(planId);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan not found'
                });
            }

            const organization = await organizationModel.create({
                name: name.trim(),
                planId
            });

            try {
                await membershipModel.create({
                    userId: req.user.id,
                    organizationId: organization._id,
                    role: 'SUPERVISOR'
                });
            } catch (err) {
                await organizationModel.findByIdAndDelete(
                    organization._id
                );
                throw err;
            }

            return res.status(201).json({
                success: true,
                message: 'Organization created successfully',
                data: organization
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Organization name already exists'
                });
            }

            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to create organization'
            });
        }
    }
);


// GET MEMBERSHIPS OF THE LOGGED-IN USER
organizationRouter.get(
    '/mine',
    verifyToken,
    async (req, res) => {
        try {
            const memberships = await membershipModel.find({
                userId: req.user.id
            }).populate({
                path: 'organizationId',
                select: 'name planId',
                populate: {
                    path: 'planId',
                    select: 'name description'
                }
            });

            return res.status(200).json({
                success: true,
                message: memberships.length === 0
                    ? 'No memberships found'
                    : 'Your memberships',
                data: memberships
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch memberships'
            });
        }
    }
);


// GET ALL ORGANIZATIONS FOR THE SUPERVISOR PAGE
organizationRouter.get(
    '/',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const organizations = await organizationModel
                .find({})
                .populate('planId', 'name description');

            return res.status(200).json({
                success: true,
                data: organizations
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch organizations'
            });
        }
    }
);


// GET AVAILABLE SPECIALISTS AND KNOWLEDGE MANAGERS
organizationRouter.get(
    '/available-users',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const users = await userModel.find({
                role: {
                    $in: ['SPECIALIST', 'KNOWLEDGE_MANAGER']
                }
            }).select('name email role');

            return res.status(200).json({
                success: true,
                data: users
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch staff accounts'
            });
        }
    }
);


// GET AVAILABLE CUSTOMERS
organizationRouter.get(
    '/available-customers',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const customers = await userModel.find({
                role: 'CUSTOMER'
            }).select('name email role');

            return res.status(200).json({
                success: true,
                data: customers
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch customer accounts'
            });
        }
    }
);


// GET ONE ORGANIZATION (MEMBERS ONLY)
organizationRouter.get(
    '/:orgId',
    verifyToken,
    async (req, res) => {
        try {
            const { orgId } = req.params;

            if (!Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization ID'
                });
            }

            const organization = await organizationModel
                .findById(orgId)
                .populate('planId', 'name description');

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            const membership = await membershipModel.findOne({
                userId: req.user.id,
                organizationId: orgId
            });

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this organization'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Organization details',
                data: organization
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch organization'
            });
        }
    }
);


// GET MEMBERS OF AN ORGANIZATION
organizationRouter.get(
    '/:orgId/members',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const { orgId } = req.params;

            if (!Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization ID'
                });
            }

            const organization = await organizationModel.findById(orgId);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            if (!(await isOrgSupervisor(req.user.id, orgId))) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to view members of this organization'
                });
            }

            const memberships = await membershipModel.find({
                organizationId: orgId
            }).populate('userId', 'name email role');

            return res.status(200).json({
                success: true,
                message: 'Organization members',
                data: memberships
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch members'
            });
        }
    }
);


// GET ASSIGNABLE STAFF FOR A PARTICULAR ORGANIZATION
organizationRouter.get(
    '/:orgId/assignable-users',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const { orgId } = req.params;

            if (!Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization ID'
                });
            }

            const organization = await organizationModel.findById(orgId);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            if (!(await isOrgSupervisor(req.user.id, orgId))) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to manage this organization'
                });
            }

            const existingMemberships = await membershipModel.find({
                organizationId: orgId
            }).select('userId');

            const assignedUserIds = existingMemberships.map(
                membership => membership.userId
            );

            const users = await userModel.find({
                role: {
                    $in: ['SPECIALIST', 'KNOWLEDGE_MANAGER']
                },
                _id: {
                    $nin: assignedUserIds
                }
            }).select('name email role');

            return res.status(200).json({
                success: true,
                data: users
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch assignable users'
            });
        }
    }
);


// ASSIGN A CUSTOMER, SPECIALIST, OR KNOWLEDGE MANAGER
organizationRouter.post(
    '/:orgId/members',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const { orgId } = req.params;
            const { userId, role } = req.body;

            if (!Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization ID'
                });
            }

            const allowedFields = ['userId', 'role'];

            if (
                Object.keys(req.body).some(
                    key => !allowedFields.includes(key)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fields in request body'
                });
            }

            if (
                !userId ||
                !Types.ObjectId.isValid(userId) ||
                !validRoles.includes(role) ||
                role === 'SUPERVISOR'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid userId and assignable role are required'
                });
            }

            const organization = await organizationModel.findById(orgId);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            if (!(await isOrgSupervisor(req.user.id, orgId))) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to manage members of this organization'
                });
            }

            const user = await userModel.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (
                !['CUSTOMER', 'SPECIALIST', 'KNOWLEDGE_MANAGER'].includes(role) ||
                user.role !== role
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'The selected role must match the user account role'
                });
            }

            const existingMembership = await membershipModel.findOne({
                userId,
                organizationId: orgId
            });

            if (existingMembership) {
                return res.status(409).json({
                    success: false,
                    message: 'User is already a member of this organization'
                });
            }

            const membership = await membershipModel.create({
                userId,
                organizationId: orgId,
                role
            });

            return res.status(201).json({
                success: true,
                message: 'Member added successfully',
                data: membership
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'User is already a member of this organization'
                });
            }

            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to add member'
            });
        }
    }
);


// REMOVE A MEMBER FROM AN ORGANIZATION
organizationRouter.delete(
    '/:orgId/members/:membershipId',
    verifyToken,
    allowedRoles('SUPERVISOR'),
    async (req, res) => {
        try {
            const { orgId, membershipId } = req.params;

            if (
                !Types.ObjectId.isValid(orgId) ||
                !Types.ObjectId.isValid(membershipId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid organization or membership ID'
                });
            }

            const organization = await organizationModel.findById(orgId);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            if (!(await isOrgSupervisor(req.user.id, orgId))) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to manage members of this organization'
                });
            }

            const membership = await membershipModel.findOne({
                _id: membershipId,
                organizationId: orgId
            });

            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Membership not found'
                });
            }

            if (membership.userId.toString() === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'You cannot remove your own membership'
                });
            }

            await membershipModel.findByIdAndDelete(membershipId);

            return res.status(200).json({
                success: true,
                message: 'Member removed successfully'
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to remove member'
            });
        }
    }
);
