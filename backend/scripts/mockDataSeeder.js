import mongoose from 'mongoose'
import dns from 'node:dns'
import { config } from 'dotenv'
import { hash } from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { planModel } from '../models/planModel.js'
import { organizationModel } from '../models/organizationModel.js'
import { userModel } from '../models/userModel.js'
import { membershipModel } from '../models/membershipModel.js'
import { ticketModel } from '../models/ticketModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load backend .env
config({ path: path.resolve(__dirname, '../.env') })
dns.setServers(['8.8.8.8', '8.8.4.4'])

export async function seedMockData() {
    try {
        console.log('Connecting to database...')
        await mongoose.connect(process.env.DB_URL)
        console.log('Connected to MongoDB successfully.')

        // Ensure indexes (including the unique compound index on membership)
        await organizationModel.syncIndexes()
        await membershipModel.syncIndexes()

        console.log('Cleaning up existing mock review data...')
        const mockEmails = [
            'alice.apex@example.com',
            'bob.nexus@example.com',
            'charlie.orphan@example.com',
            'sarah.specialist@apex.com',
            'sam.supervisor@support.com'
        ]

        const existingUsers = await userModel.find({ email: { $in: mockEmails } })
        const userIds = existingUsers.map(u => u._id)

        const orgNames = ['Apex Global Technologies', 'Nexus Dynamic Systems']
        const existingOrgs = await organizationModel.find({ name: { $in: orgNames } })
        const orgIds = existingOrgs.map(o => o._id)

        await ticketModel.deleteMany({
            $or: [
                { createdBy: { $in: userIds } },
                { organizationId: { $in: orgIds } }
            ]
        })

        await membershipModel.deleteMany({
            $or: [
                { userId: { $in: userIds } },
                { organizationId: { $in: orgIds } }
            ]
        })

        await organizationModel.deleteMany({ name: { $in: orgNames } })
        await userModel.deleteMany({ email: { $in: mockEmails } })

        console.log('Existing mock data cleaned.')

        // 1. Seed or retrieve Plans
        let planA = await planModel.findOne({ name: 'Enterprise Support Plan' })
        if (!planA) {
            planA = await planModel.create({
                name: 'Enterprise Support Plan',
                description: '24/7 dedicated support with 1-hour SLA'
            })
        }

        let planB = await planModel.findOne({ name: 'Standard Support Plan' })
        if (!planB) {
            planB = await planModel.create({
                name: 'Standard Support Plan',
                description: 'Standard business hours support with 24-hour SLA'
            })
        }

        console.log(`Plans ready: Plan A (${planA._id}), Plan B (${planB._id})`)

        // 2. Seed Organizations
        const orgA = await organizationModel.create({
            name: 'Apex Global Technologies',
            planId: planA._id
        })

        const orgB = await organizationModel.create({
            name: 'Nexus Dynamic Systems',
            planId: planB._id
        })

        console.log(`Organizations created: Apex (${orgA._id}), Nexus (${orgB._id})`)

        // 3. Seed Users
        const passwordHash = await hash('Password123!', 12)

        const userAlice = await userModel.create({
            name: 'Alice (Apex Customer)',
            email: 'alice.apex@example.com',
            password: passwordHash,
            role: 'CUSTOMER'
        })

        const userBob = await userModel.create({
            name: 'Bob (Nexus Customer)',
            email: 'bob.nexus@example.com',
            password: passwordHash,
            role: 'CUSTOMER'
        })

        const userCharlie = await userModel.create({
            name: 'Charlie (Unaffiliated Customer)',
            email: 'charlie.orphan@example.com',
            password: passwordHash,
            role: 'CUSTOMER'
        })

        const userSarah = await userModel.create({
            name: 'Sarah (Apex Specialist)',
            email: 'sarah.specialist@apex.com',
            password: passwordHash,
            role: 'SPECIALIST'
        })

        const userSam = await userModel.create({
            name: 'Sam (Support Supervisor)',
            email: 'sam.supervisor@support.com',
            password: passwordHash,
            role: 'SUPERVISOR'
        })

        console.log('Users created successfully.')

        // 4. Seed Memberships
        const memAlice = await membershipModel.create({
            userId: userAlice._id,
            organizationId: orgA._id,
            role: 'CUSTOMER'
        })

        const memBob = await membershipModel.create({
            userId: userBob._id,
            organizationId: orgB._id,
            role: 'CUSTOMER'
        })

        const memSarah = await membershipModel.create({
            userId: userSarah._id,
            organizationId: orgA._id,
            role: 'SPECIALIST'
        })

        const memSam = await membershipModel.create({
            userId: userSam._id,
            organizationId: orgA._id,
            role: 'SUPERVISOR'
        })

        console.log('Memberships created successfully.')

        // 5. Seed an initial ticket for Org B (to test cross-org access and staff updates)
        const ticketBob = await ticketModel.create({
            organizationId: orgB._id,
            createdBy: userBob._id,
            title: 'Nexus VPN Gateway connectivity issue',
            description: 'Unable to connect to Nexus internal network',
            priority: 'HIGH',
            status: 'OPEN'
        })

        const mockData = {
            plans: {
                enterprise: { id: planA._id.toString(), name: planA.name },
                standard: { id: planB._id.toString(), name: planB.name }
            },
            organizations: {
                apex: { id: orgA._id.toString(), name: orgA.name, planId: orgA.planId.toString() },
                nexus: { id: orgB._id.toString(), name: orgB.name, planId: orgB.planId.toString() }
            },
            users: {
                customerApex: { id: userAlice._id.toString(), name: userAlice.name, email: userAlice.email, password: 'Password123!', role: userAlice.role, orgName: 'Apex Global Technologies', orgId: orgA._id.toString() },
                customerNexus: { id: userBob._id.toString(), name: userBob.name, email: userBob.email, password: 'Password123!', role: userBob.role, orgName: 'Nexus Dynamic Systems', orgId: orgB._id.toString() },
                customerUnaffiliated: { id: userCharlie._id.toString(), name: userCharlie.name, email: userCharlie.email, password: 'Password123!', role: userCharlie.role, orgName: null, orgId: null },
                specialistApex: { id: userSarah._id.toString(), name: userSarah.name, email: userSarah.email, password: 'Password123!', role: userSarah.role, orgName: 'Apex Global Technologies', orgId: orgA._id.toString() },
                supervisorApex: { id: userSam._id.toString(), name: userSam.name, email: userSam.email, password: 'Password123!', role: userSam.role, orgName: 'Apex Global Technologies', orgId: orgA._id.toString() }
            },
            memberships: {
                aliceApex: { id: memAlice._id.toString(), userId: userAlice._id.toString(), organizationId: orgA._id.toString(), role: memAlice.role },
                bobNexus: { id: memBob._id.toString(), userId: userBob._id.toString(), organizationId: orgB._id.toString(), role: memBob.role },
                sarahApex: { id: memSarah._id.toString(), userId: userSarah._id.toString(), organizationId: orgA._id.toString(), role: memSarah.role },
                samApex: { id: memSam._id.toString(), userId: userSam._id.toString(), organizationId: orgA._id.toString(), role: memSam.role }
            },
            tickets: {
                ticketBobNexus: { id: ticketBob._id.toString(), organizationId: orgB._id.toString(), createdBy: userBob._id.toString(), title: ticketBob.title }
            }
        }

        const outPath = path.resolve(__dirname, 'mockData.json')
        fs.writeFileSync(outPath, JSON.stringify(mockData, null, 2))
        console.log(`Mock data summary saved to: ${outPath}`)

        return mockData
    } catch (error) {
        console.error('Error seeding mock data:', error)
        throw error
    } finally {
        await mongoose.disconnect()
        console.log('Database disconnected.')
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seedMockData().then(() => {
        console.log('Seeding completed successfully.')
        process.exit(0)
    }).catch(err => {
        console.error(err)
        process.exit(1)
    })
}
