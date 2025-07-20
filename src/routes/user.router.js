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
        updateAccountDetails,
        changeCurrentPassword,
} from "../controllers/user.controller.js";
import multer from "multer";

const router = Router();

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
router.route("/logout").post(authMiddleware, logoutUser);
router.route("/change-pass").get(authMiddleware, getCurrentUser);
router.route("/get-cur-user").post(authMiddleware, changeCurrentPassword);
router.route("/update-user-data").post(authMiddleware, updateAccountDetails);

router.route("/update-avatar").post(
        upload.single("avatar"),
        authMiddleware,
        updateAvatar
);

router.route("/update-cover-img").post(
        upload.single("coverImage"),
        authMiddleware,
        updateCoverImage
);

export default router;
