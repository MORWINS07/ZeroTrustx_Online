const express = require("express");

const {
    create,
    getAll,
    getOne,
    update,
    remove
} = require("../controllers/policyController");

const authenticate = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    requirePermission("policies", "write"),
    create
);

router.get(
    "/",
    authenticate,
    requirePermission("policies", "read"),
    getAll
);

router.get(
    "/:id",
    authenticate,
    requirePermission("policies", "read"),
    getOne
);

router.patch(
    "/:id",
    authenticate,
    requirePermission("policies", "write"),
    update
);

router.delete(
    "/:id",
    authenticate,
    requirePermission("policies", "write"),
    remove
);

module.exports = router;