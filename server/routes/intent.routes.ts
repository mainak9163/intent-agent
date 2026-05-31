import { Router } from "express";
import { classifyIntentHandler } from "../controllers/intent.controllers";

const router = Router();

router.post("/classify", classifyIntentHandler);

export default router;
