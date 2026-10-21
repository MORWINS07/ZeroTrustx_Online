const express = require("express");
const { register, login, requestDeviceToken } = require("../controllers/authController");
const { verifyLogin } = require("../controllers/mfaController");
const {
    registerValidation,
    loginValidation
} = require("../middleware/authValidation");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
    "/register",
    registerValidation,
    validateRequest,
    register
);

router.post(
    "/login",
    loginValidation,
    validateRequest,
    login
);

// Existing users who need to enroll a new/additional device:
// provide credentials to receive a short-lived bootstrap token.
router.post("/request-device-token", requestDeviceToken);

// Convenience alias: POST /api/v1/auth/mfa/verify -> completes MFA login challenge
router.post(
    "/mfa/verify",
    verifyLogin
);

module.exports = router;