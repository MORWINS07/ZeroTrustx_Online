const express = require("express");

const {
    create,
    getAll,
    getOne,
    update,
    remove
} = require("../controllers/resourceController");

const authenticate = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const router = express.Router();

// Read resources
router.get(
    "/",
    authenticate,
    requirePermission("resources", "read"),
    getAll
);

router.get(
    "/:id",
    authenticate,
    requirePermission("resources", "read"),
    getOne
);

// Manage resources
router.post(
    "/",
    authenticate,
    requirePermission("resources", "write"),
    create
);

router.patch(
    "/:id",
    authenticate,
    requirePermission("resources", "write"),
    update
);

router.delete(
    "/:id",
    authenticate,
    requirePermission("resources", "write"),
    remove
);

module.exports = router;