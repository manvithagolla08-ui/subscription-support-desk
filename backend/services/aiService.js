
import { ChatOllama } from "@langchain/ollama";
import { membershipModel } from "../models/membershipModel.js";
import { organizationModel } from "../models/organizationModel.js";
import { getPlanEntitlements } from "./planEntitlementService.js";

const chatModel = new ChatOllama({
    model: process.env.OLLAMA_CHAT_MODEL || "qwen3:4b",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    temperature: 0,
});

async function getPlanContext(userId) {
    const memberships = await membershipModel.find({
        userId,
        role: "CUSTOMER"
    }).select("organizationId");

    if (memberships.length === 0) {
        return "Plan information is unavailable for this customer.";
    }

    const results = [];

    for (const membership of memberships) {
        const organizationId = membership.organizationId;

        try {
            const [organization, planData] = await Promise.all([
                organizationModel.findById(organizationId).select("name"),
                getPlanEntitlements(userId, organizationId)
            ]);

            if (organization) {
                results.push({
                    organization: organization.name,
                    plan: planData.plan,
                    entitlements: planData.entitlements
                });
            }
        } catch (error) {
            console.error(
                "Plan lookup failed:",
                error.message
            );
        }
    }

    if (results.length === 0) {
        return "Plan and entitlement information could not be retrieved.";
    }

    return JSON.stringify(results);
}

export async function generateAIAnswer(question, context, userId) {
    const planContext = await getPlanContext(userId);

    console.log("PLAN CONTEXT:", planContext);
console.log("HELP CONTEXT:", context);

    const response = await chatModel.invoke([
        
[
    "system",
    `You are a product support assistant.

Use the supplied help articles and verified plan data to answer.
The verified plan data belongs to the customer context provided
by the application. When it contains an organization name and
plan name, answer directly using those values.

For questions about the customer's subscription, state the
organization name and subscription plan clearly.
For feature questions, use the matching entitlement's allowed
value. Do not invent plan details or feature permissions.

If the required information is genuinely missing, say you
cannot confirm it.

HELP ARTICLE CONTEXT:
${context}

VERIFIED PLAN AND ENTITLEMENT DATA:
${planContext}`
]
,
        ["human", question]
    ]);

    return typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
}
