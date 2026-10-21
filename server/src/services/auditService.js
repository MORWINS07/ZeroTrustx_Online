const AuditEvent = require("../models/AuditEvent");

const createAuditEvent = async ({
    actorUserId = null,
    eventType,
    targetType,
    targetId = null,
    action,
    result,
    metadata = {},
    ipAddress = null,
    userAgent = null
}) => {
    const auditEvent = await AuditEvent.create({
        actorUserId,
        eventType,
        targetType,
        targetId,
        action,
        result,
        metadata,
        ipAddress,
        userAgent
    });

    return auditEvent;
};

const getAuditEvents = async () => {
    return AuditEvent.find()
        .sort({ createdAt: -1 })
        .populate("actorUserId", "name email");
};

const getAuditEventById = async (auditEventId) => {
    const auditEvent = await AuditEvent.findById(auditEventId)
        .populate("actorUserId", "name email");

    if (!auditEvent) {
        throw new Error("Audit event not found");
    }

    return auditEvent;
};

module.exports = {
    createAuditEvent,
    getAuditEvents,
    getAuditEventById
};