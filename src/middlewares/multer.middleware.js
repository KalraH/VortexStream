import os from "os";
import multer from "multer";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";

const storage = multer.diskStorage({
        destination: (req, file, cb) => {
                cb(null, os.tmpdir());
        },
        filename: (req, file, cb) => {
                const uniqueSuffix =
                        Date.now() + "-" + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + "-" + file.originalname);
        },
});

export const upload = multer({
        storage,
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
                const allowedExt = /jpeg|jpg|png|gif|mp4/;

                const ext = file.originalname.split(".").pop().toLowerCase();

                const extname = allowedExt.test(ext);

                const allowedMimeTypes = [
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                        "image/gif",
                        "video/mp4",
                ];
                const mimetype = allowedMimeTypes.includes(file.mimetype);

                if (extname && mimetype) {
                        return cb(null, true);
                }

                cb(
                        new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "MULTER, Only images and MP4 videos are allowed"
                        )
                );
        },
});
