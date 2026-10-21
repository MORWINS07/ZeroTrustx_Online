const { revokeSession } = require("../services/sessionService");
const { createAuditEvent } = require("../services/auditService");

const logout = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const session = await revokeSession(sessionId, req.user.userId);

        await createAuditEvent({
            actorUserId: req.user.userId,
            eventType: "LOGOUT",
            targetType: "SESSION",
            targetId: session._id,
            action: "logout",
            result: "SUCCESS",
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        res.status(200).json({
            success: true,
            message: "Logout successful",
            session: {
                id: session._id,
                status: session.status,
                revokedAt: session.revokedAt
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { logout };