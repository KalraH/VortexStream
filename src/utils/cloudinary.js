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
                        { resource_type: "auto" }
                );

                // Clean up the file if upload is completed
                fs.unlinkSync(filePath);

                return uploadResult;
        } catch (error) {
                // Clean up the file if upload fails
                fs.unlinkSync(filePath);

                console.error(
                        "CLOUDINARY, UPLOAD TO CLOUD,",
                        "Error uploading file:",
                        error
                );

                return null;
        }
};

/**
 * Delete a file on Cloudinary.
 * @param {string} publicId - The Public-ID of file for deletion.
 * @param {string} resource_type - The Resource Type of file for deletion.
 *
 * @returns {boolean} - The status of file deletion.
 */
const deleteFromCloud = async (publicId, resource_type = "image") => {
        try {
                if (!publicId) return false;

                const deletionResult = await cloudinary.uploader.destroy(
                        publicId,
                        { resource_type: `${resource_type}` }
                );

                if (deletionResult.result === "ok") {
                        console.log(
                                "CLOUDINARY, DELETE,",
                                `Successfully deleted ${publicId}`
                        );
                        return true;
                } else {
                        console.warn(
                                "CLOUDINARY, DELETE,",
                                `Unexpected result:`,
                                deletionResult
                        );
                        return false;
                }
        } catch (error) {
                console.error(
                        "CLOUDINARY, DEL FROM CLOUD,",
                        "Error uploading file:",
                        error
                );
                return false;
        }
};

export { uploadOnCloud, deleteFromCloud };
