const express = require("express");

const { logout } = require("../controllers/logoutController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, logout);

module.exports = router;