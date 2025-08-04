import connectToDatabase from "./config/dbConfig.js";
import app from "./app.js";

const startServer = async () => {
        try {
                await connectToDatabase();
                console.log(
                        "INDEX, ",
                        "Database connection established successfully."
                );

                const PORT = process.env.PORT || 5000;
                app.listen(PORT, () => {
                        console.log(
                                "INDEX,",
                                `Server is running on port ${PORT}`
                        );
                });
                console.log("INDEX,", "Express app initialized successfully.");
        } catch (error) {
                console.error("INDEX, ", "Failed to start the server:", error);
                process.exit(1);
        }
};

startServer();
