import mongoose from "mongoose";
import { CONSTANTS } from "../constants.js";

/**
 * Connects to the MongoDB database using Mongoose.
 *
 * @returns {Promise<void>} - A promise that resolves when the connection is established.
 */
const connectToDatabase = async () => {
        try {
                const connectionInstance = await mongoose.connect(
                        `${process.env.MONGO_DB_URI}/${CONSTANTS.DB_NAME}`
                );
                console.log(
                        "DB CONFIG,",
                        `Connected to database: ${CONSTANTS.DB_NAME}`
                );
                console.log(
                        "DB CONFIG,",
                        `DB Port: ${connectionInstance.connection.port} | Host: ${connectionInstance.connection.host}`
                );

                // console.log("DB CONFIG,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(connectionInstance);
                // console.log("DB CONFIG,", "TESTING LOGGING END ----------------------------------------------------------------");
        } catch (error) {
                console.error("DB CONFIG,", "MONGODB connection error:", error);
                process.exit(1);
        }
};

export default connectToDatabase;
