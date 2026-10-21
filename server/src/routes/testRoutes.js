const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const requireTrustedDevice = require("../middleware/deviceAuthorizationMiddleware");

const router = express.Router();

router.get("/protected", authenticate, (req, res) => {
    res.json({
        message: "Protected route accessed successfully",
        userId: req.user.userId
    });
});

router.get(
    "/trusted-device",
    authenticate,
    requireTrustedDevice,
    (req, res) => {
        res.status(200).json({
            message: "Trusted device access granted",
            device: {
                id: req.device._id,
                name: req.device.name,
                status: req.device.status
            }
        });
    }
);

module.exports = router;