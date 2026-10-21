const express = require("express");

const {
    create,
    getAll
} = require("../controllers/permissionController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getAll);
router.post("/", authenticate, create);

module.exports = router;