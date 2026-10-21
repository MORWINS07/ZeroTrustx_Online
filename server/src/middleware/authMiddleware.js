const { verifyAccessToken } = require("../utils/jwt");
const Session = require("../models/Session");

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyAccessToken(token);

        // Continuous Session Verification (Zero Trust):
        // If the token was issued against a session, ensure the session is active and not revoked/expired.
        if (decoded.sessionId) {
            const session = await Session.findById(decoded.sessionId);
            if (!session || session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
                return res.status(401).json({
                    message: "Session is revoked or expired"
                });
            }
        }

        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        };

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticate;