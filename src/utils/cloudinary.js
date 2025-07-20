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

                // Clean up the file if upload is completed
                fs.unlinkSync(filePath);

                return uploadResult.url;
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

const getCloudinaryPublicId = (url) => {
        try {
                const urlParts = url.split("/");
                const fileWithExt = urlParts.pop(); // e.g., g9ecyquilzpktupweu5j.png
                const fileName = fileWithExt.split(".")[0]; // g9ecyquilzpktupweu5j

                // Remove everything until 'upload' (including version)
                const uploadIndex = urlParts.indexOf("upload");
                const folderParts = urlParts.slice(uploadIndex + 1); // After 'upload'

                // Remove version if it exists (starts with 'v' followed by numbers)
                if (
                        folderParts[0]?.startsWith("v") &&
                        !isNaN(folderParts[0].slice(1))
                ) {
                        folderParts.shift(); // remove the version
                }

                return folderParts.length > 0
                        ? `${folderParts.join("/")}/${fileName}`
                        : fileName;
        } catch (error) {
                console.error(
                        "CLOUDINARY, GET PUB ID,",
                        "Error extracting Public URL:",
                        error
                );
                return null;
        }
};

const deleteFromCloud = async (cloudURL) => {
        try {
                if (!cloudURL) return false;

                const publicID = getCloudinaryPublicId(cloudURL);

                const deletionResult = await cloudinary.uploader.destroy(
                        publicID,
                        { resource_type: "image" }
                );

                if (deletionResult.result === "ok") {
                        console.log(
                                "CLOUDINARY, DELETE,",
                                `Successfully deleted ${publicID}`
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
