import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
        getLikedVideos,
        toggleCommentLike,
        toggleVideoLike,
        toggleTweetLike,
} from "../controllers/like.controller.js";

const router = Router();
router.use(authMiddleware);

/* Secured Routes. */
router.route("/videos").get(getLikedVideos);
router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);

export default router;
