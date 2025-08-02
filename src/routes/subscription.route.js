import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
        getSubscribedChannels,
        getUserChannelSubscribers,
        toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(authMiddleware);

/* Secured Routes. */
router.route("/u/:subscriberId").get(getUserChannelSubscribers);
router.route("/c/:subscriberId")
        .get(getSubscribedChannels)
        .post(toggleSubscription);

export default router;
