const { refreshSession } = require("../services/sessionService");
const { generateAccessToken } = require("../utils/jwt");

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                message: "Refresh token is required"
            });
        }

        const result = await refreshSession(refreshToken);

        const accessToken = generateAccessToken(
            result.userId,
            { sessionId: result.session._id.toString() }
        );

        res.status(200).json({
            message: "Access token refreshed successfully",
            accessToken,
            session: {
                id: result.session._id,
                status: result.session.status,
                lastActivityAt: result.session.lastActivityAt,
                expiresAt: result.session.expiresAt
            }
        });
    } catch (error) {
        res.status(401).json({
            message: error.message
        });
    }
};

module.exports = {
    refresh
};