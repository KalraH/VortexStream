import Mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";

/**
 * Get all Channel Content (Stats).
 * @route 	GET /stats
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current Channel details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all Channel Content (Stats).
 */
const getChannelStats = asyncHandler(async (req, res) => {
        try {
                const userId = req?.user?._id;

                const totalSubscribers = await Subscription.aggregate([
                        // Getting All subscription models through channel where Subscriber is current user.
                        {
                                $match: {
                                        channel: Mongoose.Types.ObjectId(
                                                userId
                                        ),
                                },
                        },
                        // Grouping all matching docs into single group with subscriberCount storing the no of subscribers.
                        {
                                $group: {
                                        _id: null,
                                        subscribersCount: {
                                                $sum: 1,
                                        },
                                },
                        },
                ]);

                const videoInstance = await Video.aggregate([
                        // Get All videos where Owner is current channel's user.
                        {
                                $match: {
                                        owner: Mongoose.Types.ObjectId(userId),
                                },
                        },
                        // Get all likes from Video model where $video has the _id of this video.
                        {
                                $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "video",
                                        as: "likedVideos",
                                },
                        },
                        // Gather together only relevant fields.
                        {
                                $project: {
                                        totalLikes: {
                                                $size: "$likedVideos",
                                        },
                                        totalViews: "$views",
                                        totalVideos: 1,
                                },
                        },
                        // Group together these fields.
                        {
                                $group: {
                                        _id: null,
                                        totalLikes: {
                                                $sum: "$totalLikes",
                                        },
                                        totalViews: {
                                                $sum: "$totalViews",
                                        },
                                        totalVideos: {
                                                $sum: 1,
                                        },
                                },
                        },
                ]);

                const channelStats = {
                        totalSubscribers:
                                totalSubscribers[0].subscribersCount || 0,
                        totalLikes: videoInstance[0].totalLikes || 0,
                        totalViews: videoInstance[0].totalViews || 0,
                        totalVideos: videoInstance[0].totalVideos || 0,
                };

                if (!channelStats) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "DASHBOARD CONTROLLER, GET CHANNEL STATS, Channel Stats collection failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `DASHBOARD CONTROLLER, GET CHANNEL STATS, User ${userId} channel stats fetched successfully.`,
                                        channelStats
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "DASHBOARD CONTROLLER, GET CHANNEL STATS, CATCH, An error occurred while getting channel Stats.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get all Channel Videos.
 * @route 	GET /videos
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current Channel details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all videos for the channel.
 */
const getChannelVideos = asyncHandler(async (req, res) => {
        try {
                const userId = req?.user?._id;

                const channelVideos = await Video.aggregate([
                        // Get All videos where Owner is current channel's user.
                        {
                                $match: {
                                        owner: Mongoose.Types.ObjectId(userId),
                                },
                        },
                        // Get all likes from Video model where $video has the _id of this video.
                        {
                                $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "video",
                                        as: "likedVideos",
                                },
                        },
                        // Adding new fields taking total Likes count & createdAt is broken into Year, Month, Date.
                        {
                                $addFields: {
                                        createdAt: {
                                                $dateToParts: {
                                                        date: "$createdAt",
                                                },
                                        },
                                        totalLikes: {
                                                $size: "$likedVideos",
                                        },
                                },
                        },
                        // Sorting videos in a way that latest video appears first
                        {
                                $sort: {
                                        createdAt: -1,
                                },
                        },
                        //Gather together only relevant fields.
                        {
                                $project: {
                                        "videoFile.secure_url": 1,
                                        "thumbnail.secure_url": 1,
                                        title: 1,
                                        description: 1,
                                        duration: 1,
                                        isPublished: 1,
                                        totalLikes: 1,
                                        createdAt: {
                                                year: 1,
                                                month: 1,
                                                day: 1,
                                        },
                                },
                        },
                ]);

                if (!channelVideos) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "DASHBOARD CONTROLLER, GET CHANNEL VIDS, Channel Videos gathering failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `DASHBOARD CONTROLLER, GET CHANNEL VIDS, User ${userId} channel Videos fetched successfully.`,
                                        channelVideos
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "DASHBOARD CONTROLLER, GET CHANNEL VIDS, CATCH, An error occurred while getting channel Videos.",
                        [error.message],
                        error.stack
                );
        }
});

export { getChannelStats, getChannelVideos };
