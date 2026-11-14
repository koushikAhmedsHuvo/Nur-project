import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { chatWithMentor, cProgrammingHelp } from "../controller/ai.controller.js";

const router = express.Router();

router.post("/mentor", protectRoute, chatWithMentor);
router.post("/c-help", protectRoute, cProgrammingHelp);

export default router;
