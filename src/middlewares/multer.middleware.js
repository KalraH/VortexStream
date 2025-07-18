import multer from "multer";

const storage = multer.diskStorage({
        destination: (req, file, cb) => {
                cb(null, "./public/temp");
        },
        filename: (req, file, cb) => {
                const uniqueSuffix =
                        Date.now() + "-" + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + "-" + file.originalname);
        },
});

export const upload = multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
        fileFilter: (req, file, cb) => {
                const allowedTypes = /jpeg|jpg|png|gif/;
                const extname = allowedTypes.test(file.mimetype);
                const mimetype = allowedTypes.test(
                        file.originalname.split(".").pop().toLowerCase()
                );

                if (extname && mimetype) {
                        return cb(null, true);
                }
                cb(
                        new ApiError(
                                400,
                                "MULTER, Only images are allowed",
                                [error.message],
                                error.stack
                        )
                );
        },
});
