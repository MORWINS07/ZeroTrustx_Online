const { checkDeviceAccess } = require("../services/deviceAuthorizationService");

const requireTrustedDevice = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const deviceIdentifier = req.headers["x-device-id"];

        if (!deviceIdentifier) {
            return res.status(400).json({
                message: "Device identifier is required"
            });
        }

        const result = await checkDeviceAccess(
            deviceIdentifier,
            req.user.userId
        );

        if (!result.allowed) {
            return res.status(403).json({
                message: "Device access denied",
                reason: result.reason
            });
        }

        req.device = result.device;

        next();
    } catch (error) {
        return res.status(500).json({
            message: "Device authorization check failed"
        });
    }
};

module.exports = requireTrustedDevice;