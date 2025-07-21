import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {  } from "../controllers/subscription.controller.js";

const router = Router();

/**
 * Unsecured Routes.
 */
router.route("/").post(  );


/**
 * Secured Routes.
 */
router.route("/").post(  );

export default router;
