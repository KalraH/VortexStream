import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { CONSTANTS } from "./constants.js";
import connectToDatabase from "./config/dbConfig.js";

import likeRouter from "./routes/like.route.js";
import userRouter from "./routes/user.route.js";
import tweetRouter from "./routes/tweet.route.js";
import videoRouter from "./routes/video.route.js";
import commentRouter from "./routes/comment.route.js";
import playlistRouter from "./routes/playlist.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import healthcheckRouter from "./routes/healthCheck.route.js";
import subscriptionRouter from "./routes/subscription.route.js";

/* Initialize the Express application */
const app = express();

/* Conecting to DB server. */
await connectToDatabase().catch(console.error);

/* Setting CORS origin. */
const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : [`http://localhost:${process.env.PORT || 5173}`];

app.use(
        cors({
                origin: corsOrigins,
                credentials: true,
        })
);

/* Middleware to parse JSON and URL-encoded data */
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

/* Defining All Routes. */
/**
 * Health Check Route.
 * @route 	{base_url}/
 * @access 	Public
 */
app.use("/", healthcheckRouter);

/**
 * User Routes.
 * @route 	{base_url}/api/1/users
 * @access 	Public | Private
 */
app.use("/api/1/users", userRouter);

/**
 * Tweet Routes.
 * @route 	{base_url}/api/1/tweets
 * @access 	Private
 */
app.use("/api/1/tweet", tweetRouter);

/**
 * Subscription Routes.
 * @route 	{base_url}/api/1/subscriptions
 * @access 	Private
 */
app.use("/api/1/subscriptions", subscriptionRouter);

/**
 * Video Routes.
 * @route 	{base_url}/api/1/video
 * @access 	Private
 */
app.use("/api/1/video", videoRouter);

/**
 * Comment Routes.
 * @route 	{base_url}/api/1/comments
 * @access 	Private
 */
app.use("/api/1/comments", commentRouter);

/**
 * Like Routes.
 * @route 	{base_url}/api/1/likes
 * @access 	Private
 */
app.use("/api/1/likes", likeRouter);

/**
 * Playlist Routes.
 * @route 	{base_url}/api/1/playlist
 * @access 	Private
 */
app.use("/api/1/playlist", playlistRouter);

/**
 * dashboard Routes.
 * @route 	{base_url}/api/1/dashboard
 * @access 	Private
 */
app.use("/api/1/dashboard", dashboardRouter);

export default app;
