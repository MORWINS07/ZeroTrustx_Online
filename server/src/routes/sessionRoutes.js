const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const {
    getUserSessions,
    revokeSession,
    revokeAllSessions,
    getSessionById
} = require("../services/sessionService");

const router = express.Router();

const getMineHandler = async (req, res) => {
    try {
        const sessions = await getUserSessions(req.user.userId, true);
        res.status(200).json({
            success: true,
            sessions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/v1/sessions and /api/v1/sessions/mine — list current user's sessions
router.get("/", authenticate, getMineHandler);
router.get("/mine", authenticate, getMineHandler);

// GET /api/v1/sessions/:sessionId
router.get("/:sessionId", authenticate, async (req, res) => {
    try {
        const session = await getSessionById(
            req.params.sessionId,
            req.user.userId
        );
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }
        res.status(200).json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const revokeHandler = async (req, res) => {
    try {
        const session = await revokeSession(
            req.params.sessionId,
            req.user.userId
        );
        res.status(200).json({
            success: true,
            message: "Session revoked successfully",
            session: {
                id: session._id,
                status: session.status,
                revokedAt: session.revokedAt
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// DELETE and POST /api/v1/sessions/:sessionId/revoke — revoke a specific session
router.delete("/:sessionId", authenticate, revokeHandler);
router.post("/:sessionId/revoke", authenticate, revokeHandler);

// DELETE /api/v1/sessions — revoke ALL sessions
router.delete("/", authenticate, async (req, res) => {
    try {
        const result = await revokeAllSessions(req.user.userId);
        res.status(200).json({
            success: true,
            message: "All sessions revoked",
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
