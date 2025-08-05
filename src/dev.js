import app from "./app.js";

/* Listning to DB. */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
        console.log("DEV,", `Local Server is running on port ${PORT}`);
});

console.log("INDEX,", "Express app initialized successfully.");
