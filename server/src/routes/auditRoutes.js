const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const {
    getAll,
    getById
} = require("../controllers/auditController");

const router = express.Router();

router.get(
    "/",
    authenticate,
    requirePermission("audit", "read"),
    getAll
);

router.get(
    "/:auditEventId",
    authenticate,
    requirePermission("audit", "read"),
    getById
);

module.exports = router;