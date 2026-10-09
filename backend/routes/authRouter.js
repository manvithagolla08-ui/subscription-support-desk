
import exp from 'express'
import { userModel } from '../models/userModel.js'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const authRouter = exp.Router()


// CUSTOMER SIGNUP
authRouter.post("/signup", async (req, res) => {
    try {
        // get customer data
        let newUser = req.body

        // check required fields
        if (!newUser.name || !newUser.email || !newUser.password) {
            return res.status(400).json({
                success: false,
                message: "name, email and password are required"
            })
        }

        // check password length
        if (newUser.password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "password must be at least 8 characters"
            })
        }

        // normalize email
        newUser.email = newUser.email.trim().toLowerCase()

        // check whether email already exists
        let existingUser = await userModel.findOne({
            email: newUser.email
        })

        if (existingUser != null) {
            return res.status(409).json({
                success: false,
                message: "email already registered"
            })
        }

        // make role CUSTOMER so users cannot register as staff
        newUser.role = "CUSTOMER"

        // hash password
        newUser.password = await hash(newUser.password, 12)

        // save in DB
        let userDocument = await userModel.create(newUser)

        // send response without password
        res.status(201).json({
            success: true,
            message: "customer registered successfully",
            data: {
                id: userDocument._id,
                name: userDocument.name,
                email: userDocument.email,
                role: userDocument.role
            }
        })
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "email already registered"
            })
        }

        res.status(500).json({
            success: false,
            message: err.message
        })
    }
})


// CUSTOMER / STAFF LOGIN
authRouter.post("/login", async (req, res) => {
    try {
        // get credentials
        let credObj = req.body

        if (!credObj.email || !credObj.password) {
            return res.status(400).json({
                success: false,
                message: "email and password are required"
            })
        }

        // find user by email
        let user = await userModel.findOne({
            email: credObj.email.trim().toLowerCase()
        })

        if (user == null) {
            return res.status(401).json({
                success: false,
                message: "invalid email or password"
            })
        }

        // compare password
        let result = await compare(credObj.password, user.password)

        if (result == false) {
            return res.status(401).json({
                success: false,
                message: "invalid email or password"
            })
        }

        // generate signed token
        let signedToken = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        )

        // store token in cookie
        res.cookie("accessToken", signedToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        })

        res.status(200).json({
            success: true,
            message: "login successful",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
})


// LOGOUT
authRouter.post("/logout", (req, res) => {
    // clear access token cookie
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    })

    res.status(200).json({
        success: true,
        message: "logout successful"
    })
})