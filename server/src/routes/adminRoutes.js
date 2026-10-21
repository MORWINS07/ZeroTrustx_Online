const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const User = require("../models/User");
const Device = require("../models/Device");
const Session = require("../models/Session");
const MfaConfig = require("../models/MfaConfig");
const AuditEvent = require("../models/AuditEvent");
const AccessRequest = require("../models/AccessRequest");

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// GET /api/v1/admin/dashboard — security dashboard stats
router.get("/dashboard", async (req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            lockedUsers,
            activeSessions,
            trustedDevices,
            pendingDevices,
            blockedDevices,
            mfaEnabledCount,
            recentEvents,
            loginSuccessLast24h,
            loginFailedLast24h,
            accessAllowedLast24h,
            accessDeniedLast24h
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ accountStatus: "ACTIVE" }),
            User.countDocuments({ accountStatus: "SUSPENDED" }),
            User.countDocuments({ accountStatus: "LOCKED" }),
            Session.countDocuments({ status: "ACTIVE", expiresAt: { $gt: now } }),
            Device.countDocuments({ status: "TRUSTED" }),
            Device.countDocuments({ status: "PENDING" }),
            Device.countDocuments({ status: "BLOCKED" }),
            MfaConfig.countDocuments({ enabled: true }),
            AuditEvent.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .populate("actorUserId", "name email"),
            AuditEvent.countDocuments({ eventType: "LOGIN_SUCCESS", createdAt: { $gte: last24h } }),
            AuditEvent.countDocuments({ eventType: "LOGIN_FAILED", createdAt: { $gte: last24h } }),
            AccessRequest.countDocuments({ decision: "ALLOW", createdAt: { $gte: last24h } }),
            AccessRequest.countDocuments({ decision: "DENY", createdAt: { $gte: last24h } })
        ]);

        res.status(200).json({
            success: true,
            dashboard: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    suspended: suspendedUsers,
                    locked: lockedUsers,
                    mfaEnabled: mfaEnabledCount
                },
                devices: {
                    trusted: trustedDevices,
                    pending: pendingDevices,
                    blocked: blockedDevices
                },
                sessions: {
                    active: activeSessions
                },
                activity: {
                    loginSuccessLast24h,
                    loginFailedLast24h,
                    accessAllowedLast24h,
                    accessDeniedLast24h
                },
                recentEvents
            }
        });
    } catch (error) {
        console.error("Dashboard error:", error.message);
        res.status(500).json({ success: false, message: "Failed to load dashboard" });
    }
});

// GET /api/v1/admin/users — list all users (admin only)
router.get("/users", requirePermission("users", "read"), async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const filter = {};
        if (status) filter.accountStatus = status;

        const users = await User.find(filter)
            .populate("roles", "name")
            .select("-passwordHash")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            users,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/admin/users/:userId
router.get("/users/:userId", requirePermission("users", "read"), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate({ path: "roles", populate: { path: "permissions" } })
            .select("-passwordHash");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const [devices, sessions, mfaConfig] = await Promise.all([
            Device.find({ userId: user._id }).sort({ createdAt: -1 }),
            Session.find({ userId: user._id }).sort({ lastActivityAt: -1 }).limit(10),
            MfaConfig.findOne({ userId: user._id })
        ]);

        res.status(200).json({
            success: true,
            user,
            devices,
            sessions,
            mfa: {
                enabled: !!(mfaConfig && mfaConfig.enabled),
                method: mfaConfig ? mfaConfig.method : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH /api/v1/admin/users/:userId/status
router.patch("/users/:userId/status", requirePermission("users", "write"), async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ["ACTIVE", "SUSPENDED", "LOCKED"];

        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(", ")}` });
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { accountStatus: status },
            { new: true }
        ).select("-passwordHash");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, message: "User status updated", user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/admin/sessions — all sessions
router.get("/sessions", requirePermission("sessions", "read"), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const sessions = await Session.find(filter)
            .populate("userId", "name email")
            .populate("deviceId", "name type")
            .sort({ lastActivityAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Session.countDocuments(filter);

        res.status(200).json({
            success: true,
            sessions,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/admin/devices — all devices
router.get("/devices", requirePermission("devices", "read"), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const devices = await Device.find(filter)
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Device.countDocuments(filter);

        res.status(200).json({
            success: true,
            devices,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
