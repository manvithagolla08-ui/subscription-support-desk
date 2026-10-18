
import { membershipModel } from "../models/membershipModel.js";
import { organizationModel } from "../models/organizationModel.js";
import { planModel } from "../models/planModel.js";
import { entitlementModel } from "../models/entitlementModel.js";

export async function getPlanEntitlements(userId, organizationId) {
    // 1. Verify that the user belongs to this organization
    const membership = await membershipModel.findOne({
        userId,
        organizationId
    });

    if (!membership || membership.role !== "CUSTOMER") {
        throw new Error("Customer membership not found");
    }

    // 2. Find the organization
    const organization = await organizationModel.findById(organizationId);

    if (!organization) {
        throw new Error("Organization not found");
    }

    // 3. Find the subscription plan
    const plan = await planModel.findById(organization.planId);

    if (!plan) {
        throw new Error("Subscription plan not found");
    }

    // 4. Find all entitlements belonging to this plan
    const entitlements = await entitlementModel.find({
        planId: plan._id
    }).select("feature allowed -_id");

    // 5. Return information for the AI
    return {
        plan: {
            name: plan.name,
            description: plan.description
        },
        entitlements
    };
}
