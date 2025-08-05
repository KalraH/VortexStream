import { Router } from "express";
import { healthcheck } from "../controllers/healthCheck.controller.js";

const router = Router();

/* Un-secured Route. */
router.route("/").get(healthcheck);

export default router;
