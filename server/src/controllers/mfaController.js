const {
    setupMfa,
    verifyMfaSetup,
    verifyMfaLogin,
    getMfaStatus,
    disableMfa
} = require("../services/mfaService");

const { generateAccessToken, verifyMfaChallengeToken } = require("../utils/jwt");
const { createSession } = require("../services/sessionService");
const { createAuditEvent } = require("../services/auditService");
const User = require("../models/User");

// GET /api/v1/mfa/status
const status = async (req, res) => {
    try {
        const result = await getMfaStatus(req.user.userId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/v1/mfa/setup
const setup = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("email");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const result = await setupMfa(req.user.userId, user.email);

        res.status(200).json({
            success: true,
            message: "MFA setup initialized. Scan the QR code with Google Authenticator then call POST /api/v1/mfa/verify.",
            ...result
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// POST /api/v1/mfa/verify   (setup verification)
const verifySetup = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: "MFA token is required" });
        }

        const result = await verifyMfaSetup(req.user.userId, token);

        res.status(200).json({
            success: true,
            message: "MFA enabled successfully",
            ...result
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// POST /api/v1/mfa/disable
const disable = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: "MFA token is required to disable MFA" });
        }

        const result = await disableMfa(req.user.userId, token);

        res.status(200).json({
            success: true,
            message: "MFA disabled successfully",
            ...result
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// POST /api/v1/mfa/login/verify  (login MFA step — no auth header required)
const verifyLogin = async (req, res) => {
    let decoded = null;

    try {
        const { mfaChallengeToken, token } = req.body;

        if (!mfaChallengeToken) {
            return res.status(401).json({ success: false, message: "MFA challenge token is required" });
        }

        if (!token) {
            return res.status(400).json({ success: false, message: "MFA code is required" });
        }

        decoded = verifyMfaChallengeToken(mfaChallengeToken);

        await verifyMfaLogin(decoded.userId, token);

        const sessionResult = await createSession({
            userId: decoded.userId,
            deviceId: decoded.deviceId,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        const accessToken = generateAccessToken(decoded.userId, {
            sessionId: sessionResult.session._id.toString()
        });

        // Update lastLoginAt and fetch user with roles for response
        const updatedUser = await User.findByIdAndUpdate(
            decoded.userId,
            { lastLoginAt: new Date(), failedLoginAttempts: 0 },
            { new: true }
        ).populate("roles");

        res.status(200).json({
            success: true,
            message: "MFA verification successful",
            accessToken,
            refreshToken: sessionResult.refreshToken,
            session: {
                id: sessionResult.session._id,
                status: sessionResult.session.status,
                expiresAt: sessionResult.session.expiresAt
            },
            user: updatedUser ? {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                accountStatus: updatedUser.accountStatus,
                roles: updatedUser.roles
            } : null
        });
    } catch (error) {
        if (decoded && decoded.userId) {
            try {
                await createAuditEvent({
                    actorUserId: decoded.userId,
                    eventType: "MFA_FAILED",
                    targetType: "USER",
                    targetId: decoded.userId,
                    action: "mfa_login_verify",
                    result: "FAILURE",
                    metadata: { reason: error.message },
                    ipAddress: req.ip,
                    userAgent: req.get("user-agent")
                });
            } catch (_) {
                // Audit failure should not mask MFA error
            }
        }

        res.status(401).json({ success: false, message: error.message });
    }
};

module.exports = {
    status,
    setup,
    verifySetup,
    disable,
    verifyLogin
};