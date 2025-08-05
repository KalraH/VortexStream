import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
        deleteVideo,
        getAllVideos,
        getVideoById,
        publishAVideo,
        togglePublishStatus,
        updateVideo,
} from "../controllers/video.controller.js";

const router = Router();

/* Un-secured Routes. */
router.route("/").get(getAllVideos);

/* Secured Routes. */
router.use(authMiddleware);

router.route("/").post(
        upload.fields([
                {
                        name: "videoFile",
                        maxCount: 1,
                },
                {
                        name: "thumbnail",
                        maxCount: 1,
                },
        ]),
        publishAVideo
);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);
router.route("/:videoId")
        .get(getVideoById)
        .delete(deleteVideo)
        .patch(upload.single("thumbnail"), updateVideo);

export default router;
