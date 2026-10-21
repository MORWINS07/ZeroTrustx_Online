const express = require("express");

const {
    create,
    getAll,
    addPermissions
} = require("../controllers/roleController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getAll);
router.post("/", authenticate, create);
router.patch("/:id/permissions", authenticate, addPermissions);

module.exports = router;