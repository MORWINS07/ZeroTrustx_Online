const express = require("express");
const { refresh } = require("../controllers/refreshController");

const router = express.Router();

router.post("/", refresh);

module.exports = router;