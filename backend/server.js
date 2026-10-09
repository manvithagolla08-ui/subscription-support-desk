
import exp from 'express'
import { connect } from 'mongoose'
import { config } from 'dotenv'
import cookieParser from 'cookie-parser'



// Import API route modules
import { authRouter } from './routes/authRouter.js'
import { entitlementRouter } from './routes/entitlementRouter.js'
import { helpRouter } from './routes/helpRouter.js'
import { planRouter } from './routes/planRouter.js'
import { statusRouter } from './routes/statusRouter.js'
import { ticketRouter } from './routes/ticketRouter.js'

// Load environment variables
config()

const app = exp()
import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Body parser
app.use(exp.json())

// Cookie parser
app.use(cookieParser())

// API Route Handlers
app.use("/api/entitlements", entitlementRouter)
app.use("/api/help", helpRouter)
app.use("/api/plans", planRouter)
app.use("/api/status", statusRouter)
app.use("/api/tickets", ticketRouter)

// Port
const port = process.env.PORT

// Database connection
async function connectDB() {
    try {
        await connect(process.env.DB_URL)
        console.log("DB connected")

        // Start server
        app.listen(port, () => {
            console.log(`server listening on ${port}`)
        })
    }
    catch (err) {
        console.log("err in db connection", err)
    }
}

// Connect to database
connectDB()

//error handling middleware
app.use((err, req, res, next) => {
    console.log("error occured")
    res.json({
        success: false,
        message: err.message
    })
})