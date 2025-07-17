import connectToDatabase from './config/dbConfig.js';

const startServer = async () => {
    try {
	await connectToDatabase();
	console.log("INDEX, ", "Database connection established successfully.");
    } catch (error) {
	console.error("INDEX, ", "Failed to start the server:", error);
	process.exit(1);
    }
}

startServer();