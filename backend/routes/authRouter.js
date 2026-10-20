
import exp from "express";
import { userModel } from "../models/userModel.js";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middlewares/verifyToken.js";

export const authRouter = exp.Router();

// SIGNUP
authRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "password must be at least 8 characters",
      });
    }

    if (typeof name !== "string" || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "name and email must be strings",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "name and email cannot be empty",
      });
    }

    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "email already registered",
      });
    }

    // Default role: CUSTOMER.
    let role = "CUSTOMER";

    // Allow role selection only in isolated local development.
    if (process.env.NODE_ENV === "development") {
      const allowedDevelopmentRoles = [
        "CUSTOMER",
        "SPECIALIST",
        "KNOWLEDGE_MANAGER",
        "SUPERVISOR",
      ];

      if (req.body.role !== undefined) {
        if (!allowedDevelopmentRoles.includes(req.body.role)) {
          return res.status(400).json({
            success: false,
            message: "invalid development role",
          });
        }

        role = req.body.role;
      }
    }

    const hashedPassword = await hash(password, 12);

    const userDocument = await userModel.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "user registered successfully",
      data: {
        id: userDocument._id,
        name: userDocument.name,
        email: userDocument.email,
        role: userDocument.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "email already registered",
      });
    }

    console.error("Signup failed:", err.message);

    return res.status(500).json({
      success: false,
      message: "failed to register user",
    });
  }
});

// LOGIN
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await userModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "invalid email or password",
      });
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "invalid email or password",
      });
    }

    if (!process.env.SECRET_KEY) {
      throw new Error("SECRET_KEY is not configured");
    }

    const signedToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.cookie("accessToken", signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login failed:", err.message);

    return res.status(500).json({
      success: false,
      message: "login failed",
    });
  }
});

// CURRENT USER (lets the frontend restore the session after a page reload)
authRouter.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("name email role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "user no longer exists",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Fetching current user failed:", err.message);

    return res.status(500).json({
      success: false,
      message: "failed to fetch current user",
    });
  }
});

// LOGOUT
authRouter.post("/logout", (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "logout successful",
  });
});
