const express = require("express");

const {
    register,
    getMine,
    trust,
    revoke,
    block,
    bootstrap
} = require("../controllers/deviceController");

const authenticate = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const router = express.Router();

/**
 * POST /api/v1/devices/bootstrap
 *
 * FIRST-DEVICE ENROLLMENT — secure bootstrap for brand new users.
 *
 * Flow:
 *   1. POST /api/v1/auth/register  → response includes a `bootstrapToken` (15-min JWT)
 *   2. POST /api/v1/devices/bootstrap with Authorization: Bearer <bootstrapToken>
 *      → device is registered AND immediately trusted in one step.
 *   3. After this, normal login (email+password + x-device-id header) works.
 *
 * Security constraints (enforced in bootstrapFirstDevice service):
 *   - Requires a valid JWT (authenticated user).
 *   - Rejected if the user already has any TRUSTED device.
 *   - Device identifier must be globally unique.
 */
router.post("/bootstrap", authenticate, bootstrap);

router.post("/", authenticate, register);

router.get("/mine", authenticate, getMine);

router.post(
    "/:deviceId/trust",
    authenticate,
    requirePermission("devices", "write"),
    trust
);

router.post(
    "/:deviceId/revoke",
    authenticate,
    requirePermission("devices", "write"),
    revoke
);

router.post(
    "/:deviceId/block",
    authenticate,
    requirePermission("devices", "write"),
    block
);

module.exports = router;