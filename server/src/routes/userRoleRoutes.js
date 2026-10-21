const express = require("express");
const { assignRole } = require("../controllers/userRoleController");
const authMiddleware = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
    "/assign",
    authMiddleware,
    requirePermission("users", "write"),
    assignRole
);

module.exports = router;