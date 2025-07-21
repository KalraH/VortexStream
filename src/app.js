import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { CONSTANTS } from "./constants.js";

import likeRouter from "./routes/like.route.js";
import userRouter from "./routes/user.route.js";
import tweetRouter from "./routes/tweet.route.js";
import videoRouter from "./routes/video.router.js";
import commentRouter from "./routes/comment.route.js";
import playlistRouter from "./routes/playlist.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import subscriptionRouter from "./routes/subscription.route.js";

/* Initialize the Express application */
const app = express();

/* Middleware to parse JSON and URL-encoded data */
app.use(
        cors({
                origin:
                        process.env.CORS_ORIGIN ||
                        `http://localhost:${process.env.PORT || 5000}`,
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

/* Defining All Routes. */
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
app.use("/api/1/tweets", tweetRouter);

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

export { app };
