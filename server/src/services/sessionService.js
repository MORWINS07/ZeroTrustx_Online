const Session = require("../models/Session");
const Device = require("../models/Device");
const { createAuditEvent } = require("./auditService");
const { generateRefreshToken, hashRefreshToken } = require("../utils/refreshToken");

const SESSION_DURATION_MS = parseInt(process.env.SESSION_DURATION_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days

const createSession = async ({
    userId,
    deviceId,
    ipAddress,
    userAgent
}) => {
    const device = await Device.findOne({
        _id: deviceId,
        userId,
        status: "TRUSTED"
    });

    if (!device) {
        throw new Error("Trusted device is required to create a session");
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const session = await Session.create({
        userId,
        deviceId,
        refreshTokenHash,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        status: "ACTIVE",
        lastActivityAt: new Date(),
        expiresAt
    });

    await createAuditEvent({
        actorUserId: userId,
        eventType: "SESSION_CREATED",
        targetType: "SESSION",
        targetId: session._id,
        action: "create_session",
        result: "SUCCESS",
        metadata: {
            deviceId,
            expiresAt
        },
        ipAddress,
        userAgent
    });

    return {
        session,
        refreshToken
    };
};

const refreshSession = async (refreshToken) => {
    if (!refreshToken) {
        throw new Error("Refresh token is required");
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const session = await Session
        .findOne({ refreshTokenHash })
        .select("+refreshTokenHash");

    if (!session) {
        throw new Error("Invalid refresh token");
    }

    if (session.status !== "ACTIVE") {
        throw new Error("Session is not active");
    }

    if (session.expiresAt <= new Date()) {
        session.status = "EXPIRED";
        await session.save();
        throw new Error("Session has expired");
    }

    session.lastActivityAt = new Date();
    await session.save();

    return {
        userId: session.userId.toString(),
        session
    };
};

const revokeSession = async (sessionId, userId) => {
    const session = await Session.findOne({
        _id: sessionId,
        userId
    });

    if (!session) {
        throw new Error("Session not found");
    }

    if (session.status === "REVOKED") {
        throw new Error("Session already revoked");
    }

    session.status = "REVOKED";
    session.revokedAt = new Date();
    await session.save();

    await createAuditEvent({
        actorUserId: userId,
        eventType: "SESSION_REVOKED",
        targetType: "SESSION",
        targetId: session._id,
        action: "revoke_session",
        result: "SUCCESS",
        metadata: { sessionId }
    });

    return session;
};

const revokeAllSessions = async (userId) => {
    const result = await Session.updateMany(
        { userId, status: "ACTIVE" },
        { status: "REVOKED", revokedAt: new Date() }
    );

    await createAuditEvent({
        actorUserId: userId,
        eventType: "SESSION_REVOKED",
        targetType: "SESSION",
        targetId: null,
        action: "revoke_all_sessions",
        result: "SUCCESS",
        metadata: { revokedCount: result.modifiedCount }
    });

    return { revokedCount: result.modifiedCount };
};

const getUserSessions = async (userId, includeRevoked = false) => {
    const filter = { userId };
    if (!includeRevoked) {
        filter.status = { $in: ["ACTIVE", "EXPIRED"] };
    }

    return Session.find(filter)
        .populate("deviceId", "name type deviceIdentifier status")
        .sort({ lastActivityAt: -1 });
};

const getSessionById = async (sessionId, userId) => {
    return Session.findOne({ _id: sessionId, userId })
        .populate("deviceId", "name type deviceIdentifier status");
};

module.exports = {
    createSession,
    refreshSession,
    revokeSession,
    revokeAllSessions,
    getUserSessions,
    getSessionById
};