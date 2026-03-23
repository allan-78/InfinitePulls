const express = require("express");

const { chatWithAssistant } = require("../controllers/Assistant");
const { isAuthenticatedUser } = require("../middlewares/auth");

const router = express.Router();

router.post("/chat", isAuthenticatedUser, chatWithAssistant);

module.exports = router;
