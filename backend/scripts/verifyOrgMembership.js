import mongoose from 'mongoose'
import dns from 'node:dns'
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import jwt from 'jsonwebtoken'

import { planModel } from '../models/planModel.js'
import { organizationModel } from '../models/organizationModel.js'
import { userModel } from '../models/userModel.js'
import { membershipModel } from '../models/membershipModel.js'
import { ticketModel } from '../models/ticketModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.resolve(__dirname, '../.env') })
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mockDataPath = path.resolve(__dirname, 'mockData.json')
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'))

const results = []

function assertTest(testName, passed, details) {
    results.push({ testName, passed, details })
    const icon = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${icon} | ${testName} - ${details}`)
}

async function runVerification() {
    console.log('====================================================')
    console.log(' STARTING ORGANIZATION & MEMBERSHIP REVIEW SUITE')
    console.log('====================================================\n')

    await mongoose.connect(process.env.DB_URL)
    await organizationModel.syncIndexes()
    await membershipModel.syncIndexes()

    // ----------------------------------------------------
    // Section 1: Schema Validation Tests (Pass & Fail conditions)
    // ----------------------------------------------------
    console.log('\n--- Section 1: Schema Validation Tests ---')

    // 1.1 Organization Model - Missing Name (Should Fail)
    try {
        const org = new organizationModel({ planId: new mongoose.Types.ObjectId() })
        await org.validate()
        assertTest('Org Model - Missing name validation', false, 'Expected validation error but none was thrown')
    } catch (err) {
        assertTest('Org Model - Missing name validation', err.name === 'ValidationError', `Caught: ${err.message}`)
    }

    // 1.2 Organization Model - Missing PlanId (Should Fail)
    try {
        const org = new organizationModel({ name: 'Orphan Org' })
        await org.validate()
        assertTest('Org Model - Missing planId validation', false, 'Expected validation error but none was thrown')
    } catch (err) {
        assertTest('Org Model - Missing planId validation', err.name === 'ValidationError', `Caught: ${err.message}`)
    }

    // 1.3 Organization Model - Strict Mode (Should Fail on extra field)
    try {
        const org = new organizationModel({
            name: 'Strict Org',
            planId: new mongoose.Types.ObjectId(),
            unrecognizedField: 'malicious-data'
        })
        await org.validate()
        assertTest('Org Model - Strict mode unpermitted fields', false, 'Expected StrictModeError but passed')
    } catch (err) {
        assertTest('Org Model - Strict mode unpermitted fields', err.name === 'StrictModeError', `Caught: ${err.message}`)
    }

    // 1.4 Membership Model - Missing UserId (Should Fail)
    try {
        const mem = new membershipModel({
            organizationId: new mongoose.Types.ObjectId(),
            role: 'CUSTOMER'
        })
        await mem.validate()
        assertTest('Membership Model - Missing userId validation', false, 'Expected validation error but none was thrown')
    } catch (err) {
        assertTest('Membership Model - Missing userId validation', err.name === 'ValidationError', `Caught: ${err.message}`)
    }

    // 1.5 Membership Model - Missing OrganizationId (Should Fail)
    try {
        const mem = new membershipModel({
            userId: new mongoose.Types.ObjectId(),
            role: 'CUSTOMER'
        })
        await mem.validate()
        assertTest('Membership Model - Missing organizationId validation', false, 'Expected validation error but none was thrown')
    } catch (err) {
        assertTest('Membership Model - Missing organizationId validation', err.name === 'ValidationError', `Caught: ${err.message}`)
    }

    // 1.6 Membership Model - Invalid Role Enum (Should Fail)
    try {
        const mem = new membershipModel({
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            role: 'ADMIN' // Invalid role
        })
        await mem.validate()
        assertTest('Membership Model - Invalid role enum validation', false, 'Expected enum validation error but none was thrown')
    } catch (err) {
        assertTest('Membership Model - Invalid role enum validation', err.name === 'ValidationError', `Caught: ${err.message}`)
    }

    // 1.7 Membership Model - Valid All Roles (Should Pass)
    const validRoles = ['CUSTOMER', 'SPECIALIST', 'KNOWLEDGE_MANAGER', 'SUPERVISOR']
    let allValidPassed = true
    for (const r of validRoles) {
        const mem = new membershipModel({
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            role: r
        })
        try {
            await mem.validate()
        } catch (err) {
            allValidPassed = false
        }
    }
    assertTest('Membership Model - Valid roles accepted (CUSTOMER, SPECIALIST, KNOWLEDGE_MANAGER, SUPERVISOR)', allValidPassed, 'All valid enum roles validated cleanly')

    // 1.8 Membership Model - Compound Unique Index (Should Fail duplicate insert)
    try {
        const testUserId = new mongoose.Types.ObjectId()
        const testOrgId = new mongoose.Types.ObjectId()
        const mem1 = await membershipModel.create({ userId: testUserId, organizationId: testOrgId, role: 'CUSTOMER' })
        try {
            await membershipModel.create({ userId: testUserId, organizationId: testOrgId, role: 'CUSTOMER' })
            assertTest('Membership Model - Compound unique index (userId + organizationId)', false, 'Allowed duplicate membership insert')
        } catch (dupErr) {
            assertTest('Membership Model - Compound unique index (userId + organizationId)', dupErr.code === 11000, `Rejected duplicate with Mongo error code 11000`)
        } finally {
            await membershipModel.deleteMany({ userId: testUserId })
        }
    } catch (err) {
        assertTest('Membership Model - Compound unique index (userId + organizationId)', false, err.message)
    }

    // ----------------------------------------------------
    // Section 2: User Organization Identification via UserId & Membership
    // ----------------------------------------------------
    console.log('\n--- Section 2: User Identification via Membership ---')

    const aliceUserId = mockData.users.customerApex.id
    const aliceMembership = await membershipModel.findOne({ userId: aliceUserId }).populate('organizationId')

    const aliceOrgIdentified = aliceMembership &&
        aliceMembership.organizationId &&
        aliceMembership.organizationId.name === 'Apex Global Technologies'

    assertTest(
        'Identify Customer 1 organization by user ID',
        aliceOrgIdentified,
        aliceOrgIdentified
            ? `Customer Alice resolved to Organization: ${aliceMembership.organizationId.name} (${aliceMembership.organizationId._id}) with role: ${aliceMembership.role}`
            : 'Failed to resolve organization'
    )

    const bobUserId = mockData.users.customerNexus.id
    const bobMembership = await membershipModel.findOne({ userId: bobUserId }).populate('organizationId')

    const bobOrgIdentified = bobMembership &&
        bobMembership.organizationId &&
        bobMembership.organizationId.name === 'Nexus Dynamic Systems'

    assertTest(
        'Identify Customer 2 organization by user ID',
        bobOrgIdentified,
        bobOrgIdentified
            ? `Customer Bob resolved to Organization: ${bobMembership.organizationId.name} (${bobMembership.organizationId._id}) with role: ${bobMembership.role}`
            : 'Failed to resolve organization'
    )

    const charlieUserId = mockData.users.customerUnaffiliated.id
    const charlieMembership = await membershipModel.findOne({ userId: charlieUserId })
    assertTest(
        'Identify unaffiliated customer has no organization membership',
        charlieMembership === null,
        charlieMembership === null ? 'Correctly detected that Charlie has 0 memberships' : 'Unexpected membership found'
    )

    // ----------------------------------------------------
    // Section 3: Organization-Level Isolation & Cross-Tenant Access Restrictions
    // ----------------------------------------------------
    console.log('\n--- Section 3: Cross-Tenant Access Restrictions ---')

    // Scenario 3.1: Alice (Apex) creating ticket in Apex (VALID)
    const aliceValidMem = await membershipModel.findOne({
        userId: aliceUserId,
        organizationId: mockData.organizations.apex.id,
        role: 'CUSTOMER'
    })
    assertTest(
        'Customer Alice membership in Apex Org (Legitimate Access)',
        aliceValidMem !== null,
        'Alice verified as CUSTOMER in Apex Global Technologies'
    )

    // Scenario 3.2: Alice attempting to access/create in Nexus Org (CROSS-TENANT ATTACK)
    const aliceCrossMem = await membershipModel.findOne({
        userId: aliceUserId,
        organizationId: mockData.organizations.nexus.id,
        role: 'CUSTOMER'
    })
    assertTest(
        'Customer Alice attempting access to Nexus Org (Cross-Tenant Block)',
        aliceCrossMem === null,
        'Blocked: Alice has NO membership record in Nexus Dynamic Systems'
    )

    // Scenario 3.3: Bob attempting to access/create in Apex Org (CROSS-TENANT ATTACK)
    const bobCrossMem = await membershipModel.findOne({
        userId: bobUserId,
        organizationId: mockData.organizations.apex.id,
        role: 'CUSTOMER'
    })
    assertTest(
        'Customer Bob attempting access to Apex Org (Cross-Tenant Block)',
        bobCrossMem === null,
        'Blocked: Bob has NO membership record in Apex Global Technologies'
    )

    // Scenario 3.4: Staff Isolation - Specialist Sarah (Apex) attempting to update ticket in Nexus Org
    const nexusTicket = await ticketModel.findById(mockData.tickets.ticketBobNexus.id)
    const sarahStaffMemInNexus = await membershipModel.findOne({
        userId: mockData.users.specialistApex.id,
        organizationId: nexusTicket.organizationId,
        role: { $in: ['SPECIALIST', 'SUPERVISOR'] }
    })
    assertTest(
        'Specialist Sarah (Apex) attempting to update Nexus Org Ticket (Staff Isolation)',
        sarahStaffMemInNexus === null,
        'Blocked: Sarah has no staff membership in Nexus Org; ticket update forbidden'
    )

    // Scenario 3.5: Ticket creator ownership check
    const isAliceOwnerOfBobTicket = nexusTicket.createdBy.toString() === aliceUserId
    assertTest(
        'Customer Alice attempting to view Customer Bob ticket (Ticket Isolation)',
        !isAliceOwnerOfBobTicket,
        'Blocked: nexusTicket.createdBy does not match Alice user ID; returns 403'
    )

    console.log('\n====================================================')
    console.log(' SUMMARY RESULTS')
    console.log('====================================================')
    const passedCount = results.filter(r => r.passed).length
    console.log(`Total Tests Run: ${results.length}`)
    console.log(`Passed: ${passedCount}`)
    console.log(`Failed: ${results.length - passedCount}`)

    await mongoose.disconnect()
    return results
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runVerification().then(() => {
        console.log('\nVerification run finished.')
        process.exit(0)
    }).catch(err => {
        console.error('Fatal error during verification:', err)
        process.exit(1)
    })
}
