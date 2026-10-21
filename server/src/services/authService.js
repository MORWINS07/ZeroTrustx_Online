const User = require("../models/User");
const Role = require("../models/Role");
const MfaConfig = require("../models/MfaConfig");
const { createAuditEvent } = require("./auditService");
const { createSession } = require("./sessionService");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateAccessToken, generateMfaChallengeToken } = require("../utils/jwt");
const { getTrustedDevice } = require("./deviceService");

const registerUser = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        throw new Error("Email is already registered");
    }

    const passwordHash = await hashPassword(password);

    // Find default "User" role if seeded
    const userRole = await Role.findOne({ name: "User" });

    const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        roles: userRole ? [userRole._id] : []
    });

    await createAuditEvent({
        actorUserId: user._id,
        eventType: "USER_REGISTERED",
        targetType: "USER",
        targetId: user._id,
        action: "register",
        result: "SUCCESS",
        metadata: {
            email: user.email,
            name: user.name
        }
    });

    // Issue a short-lived bootstrap token so the user can enroll their first
    // trusted device via POST /api/v1/devices/bootstrap
    const bootstrapToken = generateAccessToken(user._id.toString(), { purpose: "BOOTSTRAP" });

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        accountStatus: user.accountStatus,
        bootstrapToken
    };
};

const loginUser = async ({
    email,
    password,
    deviceIdentifier,
    ipAddress,
    userAgent
}) => {
    // Always fetch user — use generic error to prevent email enumeration
    const user = await User.findOne({ email: email.toLowerCase() }).populate("roles");

    const genericError = "Invalid email or password";

    if (!user) {
        // Do NOT leak whether email exists
        throw new Error(genericError);
    }

    if (user.accountStatus === "LOCKED") {
        // Check if lockout has expired
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("Account is temporarily locked. Please try again later.");
        }
        // Auto-unlock if lockout expired
        user.accountStatus = "ACTIVE";
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
    }

    if (user.accountStatus === "SUSPENDED") {
        throw new Error("Account is suspended. Please contact support.");
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);

    if (!passwordMatches) {
        // Increment failed attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        // Lock after 5 failures
        if (user.failedLoginAttempts >= 5) {
            user.accountStatus = "LOCKED";
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
        }

        await user.save();

        await createAuditEvent({
            actorUserId: user._id,
            eventType: "LOGIN_FAILED",
            targetType: "USER",
            targetId: user._id,
            action: "login",
            result: "FAILURE",
            metadata: {
                reason: "Invalid password",
                failedAttempts: user.failedLoginAttempts
            },
            ipAddress,
            userAgent
        });

        throw new Error(genericError);
    }

    // Reset failed attempts on successful password match
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    // Trusted device verification
    if (!deviceIdentifier) {
        throw new Error("Device identifier is required");
    }

    let device;
    try {
        device = await getTrustedDevice(user._id, deviceIdentifier);
    } catch (e) {
        await createAuditEvent({
            actorUserId: user._id,
            eventType: "LOGIN_FAILED",
            targetType: "USER",
            targetId: user._id,
            action: "login",
            result: "FAILURE",
            metadata: {
                reason: "Untrusted device",
                deviceIdentifier
            },
            ipAddress,
            userAgent
        });
        throw new Error("Device is not trusted. Please enroll this device first.");
    }

    // Check whether MFA is enabled
    const mfaConfig = await MfaConfig.findOne({ userId: user._id });
    const mfaRequired = !!(mfaConfig && mfaConfig.enabled);

    if (mfaRequired) {
        const mfaChallengeToken = generateMfaChallengeToken(
            user._id.toString(),
            device._id.toString()
        );

        await createAuditEvent({
            actorUserId: user._id,
            eventType: "LOGIN_SUCCESS",
            targetType: "USER",
            targetId: user._id,
            action: "login",
            result: "SUCCESS",
            metadata: {
                mfaRequired: true,
                deviceId: device._id
            },
            ipAddress,
            userAgent
        });

        await user.save();

        return {
            mfaRequired: true,
            mfaChallengeToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                accountStatus: user.accountStatus
            }
        };
    }

    // MFA disabled → issue access token + create session
    const sessionResult = await createSession({
        userId: user._id.toString(),
        deviceId: device._id.toString(),
        ipAddress,
        userAgent
    });

    const accessToken = generateAccessToken(user._id.toString(), {
        sessionId: sessionResult.session._id.toString()
    });

    user.lastLoginAt = new Date();
    await user.save();

    await createAuditEvent({
        actorUserId: user._id,
        eventType: "LOGIN_SUCCESS",
        targetType: "USER",
        targetId: user._id,
        action: "login",
        result: "SUCCESS",
        metadata: {
            mfaRequired: false,
            deviceId: device._id,
            sessionId: sessionResult.session._id
        },
        ipAddress,
        userAgent
    });

    return {
        mfaRequired: false,
        accessToken,
        refreshToken: sessionResult.refreshToken,
        session: {
            id: sessionResult.session._id,
            status: sessionResult.session.status,
            expiresAt: sessionResult.session.expiresAt
        },
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            accountStatus: user.accountStatus,
            roles: user.roles
        }
    };
};

module.exports = {
    registerUser,
    loginUser
};