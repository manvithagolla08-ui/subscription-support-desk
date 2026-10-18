// One-time, idempotent script to promote a trusted existing user to SUPERVISOR.
// Usage: node scripts/promoteSupervisor.js <email>
// The user must log in again afterwards to receive a token with the new role.

import dns from 'node:dns'
import { connect, disconnect } from 'mongoose'
import { config } from 'dotenv'
import { userModel } from '../models/userModel.js'

config()
dns.setServers(["8.8.8.8", "8.8.4.4"])

async function promoteSupervisor() {
    let email = process.argv[2]

    if (!email) {
        console.log("usage: node scripts/promoteSupervisor.js <email>")
        process.exitCode = 1
        return
    }

    await connect(process.env.DB_URL)

    try {
        let user = await userModel.findOne({
            email: email.trim().toLowerCase()
        })

        if (!user) {
            console.log(`no user found with email ${email}`)
            process.exitCode = 1
            return
        }

        if (user.role === "SUPERVISOR") {
            console.log(`${user.email} is already a SUPERVISOR, nothing changed`)
            return
        }

        let previousRole = user.role
        user.role = "SUPERVISOR"
        await user.save()

        console.log(`${user.email} promoted from ${previousRole} to SUPERVISOR`)
    } finally {
        await disconnect()
    }
}

promoteSupervisor().catch(err => {
    console.error("failed to promote user:", err.message)
    process.exitCode = 1
})
