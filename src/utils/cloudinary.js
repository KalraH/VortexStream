import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary with environment variables
cloudinary.config({
        api_key: process.env.CLOUDINARY_API_KEY || "",
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
        api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

/**
 * Uploads a file to Cloudinary and returns the URL of the uploaded file.
 * @param {string} filePath - The path to the file to be uploaded.
 *
 * @returns {Promise<string|null>} - The URL of the uploaded file or null if the upload fails.
 */
const uploadOnCloud = async (filePath) => {
        try {
                if (!filePath) return null;

                const uploadResult = await cloudinary.uploader.upload(
                        filePath,
                        { resource_type: "image" }
                );

                // console.log("CLOUDINARY,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(uploadResult);
                // console.log("CLOUDINARY,", "TESTING LOGGING END ----------------------------------------------------------------");

                // Clean up the file if upload fails
                fs.unlinkSync(filePath);

                return uploadResult.url;
        } catch (error) {
                // Clean up the file if upload fails
                fs.unlinkSync(filePath);
                console.error("CLOUDINARY,", "Error uploading file:", error);

                return null;
        }
};

export default uploadOnCloud;
