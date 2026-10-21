const { registerUser, loginUser } = require("../services/authService");
const User = require("../models/User");
const { comparePassword } = require("../utils/password");
const { generateAccessToken } = require("../utils/jwt");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await registerUser({ name, email, password });

        res.status(201).json({
            success: true,
            message: "Registration successful. Use the bootstrapToken to enroll your first device.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                accountStatus: user.accountStatus
            },
            bootstrapToken: user.bootstrapToken
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const deviceIdentifier = req.headers["x-device-id"];

        const result = await loginUser({
            email,
            password,
            deviceIdentifier,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        res.status(200).json({
            success: true,
            message: result.mfaRequired
                ? "MFA required. Please complete MFA verification."
                : "Login successful.",
            ...result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * POST /api/v1/auth/request-device-token
 * Lets an existing user with valid credentials get a bootstrap token
 * to enroll a new/additional device.
 */
const requestDeviceToken = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const matches = await comparePassword(password, user.passwordHash);
        if (!matches) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (user.accountStatus === "LOCKED") {
            return res.status(403).json({ success: false, message: "Account is locked. Please try again later." });
        }
        if (user.accountStatus === "SUSPENDED") {
            return res.status(403).json({ success: false, message: "Account is suspended. Please contact support." });
        }

        // Issue a short-lived bootstrap token for device enrollment
        const bootstrapToken = generateAccessToken(user._id.toString(), { purpose: "BOOTSTRAP" });

        res.status(200).json({
            success: true,
            message: "Bootstrap token issued. Use it to enroll your device.",
            bootstrapToken,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
    requestDeviceToken
};