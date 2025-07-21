import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
        loginUser,
        logoutUser,
        registerUser,
        updateAvatar,
        getCurrentUser,
        updateCoverImage,
        refreshAccessToken,
        getUserWatchHistory,
        updateAccountDetails,
        changeCurrentPassword,
        getUserChannelProfile,
} from "../controllers/user.controller.js";

const router = Router();

// Un-Secured Routes
router.route("/register").post(
        upload.fields([
                {
                        name: "avatar",
                        maxCount: 1,
                },
                {
                        name: "coverImage",
                        maxCount: 1,
                },
        ]),
        registerUser
);

router.route("/login").post(loginUser);

// Secured Routes
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logoutUser").post(authMiddleware, logoutUser);
router.route("/get-curUser").get(authMiddleware, getCurrentUser);
router.route("/watchHistory").get(authMiddleware, getUserWatchHistory);
router.route("/change-pass").post(authMiddleware, changeCurrentPassword);
router.route("/update-userData").patch(authMiddleware, updateAccountDetails);
router.route("/userChannelProfile/:userName").get(
        authMiddleware,
        getUserChannelProfile
);

router.route("/update-avatar").patch(
        authMiddleware,
        upload.single("avatar"),
        updateAvatar
);

router.route("/update-cover-img").patch(
        authMiddleware,
        upload.single("coverImage"),
        updateCoverImage
);

export default router;
