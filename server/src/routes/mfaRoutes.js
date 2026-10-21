const express = require("express");
const { setup, verifySetup, verifyLogin, status, disable } = require("../controllers/mfaController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/status", authenticate, status);
router.post("/setup", authenticate, setup);
router.post("/verify", authenticate, verifySetup);
router.post("/enable", authenticate, verifySetup);
router.post("/disable", authenticate, disable);
router.post("/login/verify", verifyLogin);

module.exports = router;