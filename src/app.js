import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { CONSTANTS } from "./constants";

const app = express();

/* Middleware to parse JSON and URL-encoded data */
app.use(
        cors({
                origin:
                        process.env.CORS_ORIGIN ||
                        "http://localhost:`${process.env.PORT || 5000}`,",
                credentials: true,
        })
);

app.use(
        express.json({
                limit: CONSTANTS.JSON_LIMIT,
        })
);

app.use(
        express.urlencoded({
                limit: CONSTANTS.JSON_LIMIT,
                extended: true,
        })
);

app.use(express.static("public"));
app.use(cookieParser());

export { app };
