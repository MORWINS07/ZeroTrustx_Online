const express = require("express");
const { evaluate } = require("../controllers/accessDecisionController");
const authenticate = require("../middleware/authMiddleware");
const AccessRequest = require("../models/AccessRequest");

const router = express.Router();

// POST /api/v1/access-requests — evaluate access (also acts as create)
router.post("/", authenticate, evaluate);

// GET /api/v1/access-requests — history for current user
router.get("/", authenticate, async (req, res) => {
    try {
        const accessRequests = await AccessRequest
            .find({ userId: req.user.userId })
            .populate("resourceId", "name type sensitivity")
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, accessRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Legacy endpoint
router.post("/evaluate", authenticate, evaluate);

module.exports = router;