const { evaluateAccess } = require("../services/accessDecisionService");

const evaluate = async (req, res) => {
    try {
        const { resourceId, deviceId, sessionId, requestedAction } = req.body;

        if (!resourceId || !deviceId || !sessionId || !requestedAction) {
            return res.status(400).json({
                success: false,
                message: "resourceId, deviceId, sessionId, and requestedAction are required"
            });
        }

        const result = await evaluateAccess({
            userId: req.user.userId,
            resourceId,
            deviceId,
            sessionId,
            requestedAction,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        res.status(200).json({
            success: true,
            message: "Access decision evaluated successfully",
            ...result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { evaluate };