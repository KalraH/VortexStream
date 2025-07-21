import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
        addComment,
        deleteComment,
        updateComment,
        getVideoComments,
} from "../controllers/comment.controller.js";

const router = Router();
router.use(authMiddleware);

/* Secured Routes. */
router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
