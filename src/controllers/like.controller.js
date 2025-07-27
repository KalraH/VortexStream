import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Like } from "../models/like.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Mongoose, { isValidObjectId } from "mongoose";

/**
 * Informing regarding to toggle Video Like (Video is Liked by the current User or not).
 * @route 	POST /toggle/v/:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current User details in Body and Video-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with flag regarding the video liked by User.
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                if (!videoId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE VIDEO LIKE, Video-Id is required."
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE VIDEO LIKE, Video ID Invalid."
                        );
                }

                const likeInstance = await Like.findOne({
                        video: videoId,
                        likedBy: req?.user?._id,
                });
                if (likeInstance) {
                        await Like.findByIdAndDelete(likeInstance?._id);

                        return res
                                .status(HTTP_STATUS.OK)
                                .json(
                                        new ApiResponse(
                                                HTTP_STATUS.OK,
                                                `LIKE CONTROLLER, TOGGLE VIDEO LIKE, User ${req?.user?._id} video like toggeled successfully.`,
                                                { isLiked: false }
                                        )
                                );
                }

                await Like.create({
                        video: videoId,
                        likedBy: req?.user?._id,
                });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `LIKE CONTROLLER, TOGGLE VIDEO LIKE, User ${req?.user?._id} video like toggeled successfully.`,
                                        { isLiked: true }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "LIKE CONTROLLER, TOGGLE VIDEO LIKE, CATCH, An error occurred while toggling the video like.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Informing regarding to toggle Comment Like (Comment is Liked by the current User or not).
 * @route 	POST /toggle/v/:commentId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current User details in Body and Comment-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with flag regarding the comment liked by User.
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
        try {
                const { commentId } = req.params;
                if (!commentId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE COMMENT LIKE, Comment-Id is required."
                        );
                }

                if (!isValidObjectId(commentId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE COMMENT LIKE, Comment ID Invalid."
                        );
                }

                const likeInstance = await Like.findOne({
                        comment: commentId,
                        likedBy: req?.user?._id,
                });
                if (likeInstance) {
                        await Like.findByIdAndDelete(likeInstance?._id);

                        return res
                                .status(HTTP_STATUS.OK)
                                .json(
                                        new ApiResponse(
                                                HTTP_STATUS.OK,
                                                `LIKE CONTROLLER, TOGGLE COMMENT LIKE, User ${req?.user?._id} comment like toggeled successfully.`,
                                                { isLiked: false }
                                        )
                                );
                }

                await Like.create({
                        comment: commentId,
                        likedBy: req?.user?._id,
                });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `LIKE CONTROLLER, TOGGLE COMMENT LIKE, User ${req?.user?._id} comment like toggeled successfully.`,
                                        { isLiked: true }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "LIKE CONTROLLER, TOGGLE COMMENT LIKE, CATCH, An error occurred while toggling the comment like.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Informing regarding to toggle Tweet Like (Tweet is Liked by the current User or not).
 * @route 	POST /toggle/v/:tweetId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current User details in Body and Tweet-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with flag regarding the tweet liked by User.
 */
const toggleTweetLike = asyncHandler(async (req, res) => {
        try {
                const { tweetId } = req.params;
                if (!tweetId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE TWEET LIKE, Tweet-Id is required."
                        );
                }

                if (!isValidObjectId(tweetId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "LIKE CONTROLLER, TOGGLE TWEET LIKE, Tweet ID Invalid."
                        );
                }

                const likeInstance = await Like.findOne({
                        tweet: tweetId,
                        likedBy: req?.user?._id,
                });
                if (likeInstance) {
                        await Like.findByIdAndDelete(likeInstance?._id);

                        return res
                                .status(HTTP_STATUS.OK)
                                .json(
                                        new ApiResponse(
                                                HTTP_STATUS.OK,
                                                `LIKE CONTROLLER, TOGGLE TWEET LIKE, User ${req?.user?._id} tweet like toggeled successfully.`,
                                                { isLiked: false }
                                        )
                                );
                }

                await Like.create({
                        tweet: tweetId,
                        likedBy: req?.user?._id,
                });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `LIKE CONTROLLER, TOGGLE TWEET LIKE, User ${req?.user?._id} tweet like toggeled successfully.`,
                                        { isLiked: true }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "LIKE CONTROLLER, TOGGLE TWEET LIKE, CATCH, An error occurred while toggling the tweet like.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get all liked Videos by current User.
 * @route 	GET /videos
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Current User details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all videos liked by the current User.
 */
const getLikedVideos = asyncHandler(async (req, res) => {
        try {
                const userId = req?.user?._id;

                const likedVideosInstance = await Like.aggregate([
                        // Getting all videos Liked by User from likedBy
                        {
                                $match: {
                                        likedBy: Mongoose.Types.ObjectId(
                                                userId
                                        ),
                                },
                        },
                        // Getting Liked Videos
                        {
                                $lookup: {
                                        from: "videos",
                                        localField: "video",
                                        foreignField: "_id",
                                        as: "likedVideos",
                                        pipeline: [
                                                // Find owners of the Liked Videos
                                                {
                                                        from: "users",
                                                        localField: "owner",
                                                        foreignField: "_id",
                                                        as: "owner",
                                                },
                                                // Flattening the owner field's data which arrived in an array via lookup
                                                {
                                                        $unwind: {
                                                                path: "$owner",
                                                                preserveNullAndEmptyArrays: true,
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Flattening the liked Videos field's data which arrived in an array via lookup (Alternate of $addFields)
                        {
                                $unwind: {
                                        path: "$likedVideos",
                                        preserveNullAndEmptyArrays: true,
                                },
                        },
                        // Sort the videos based on Latest Updated/Created
                        {
                                $sort: {
                                        updatedAt: -1,
                                },
                        },
                        // Collect final data to-be sent
                        {
                                $project: {
                                        _id: 0,
                                        likedVideos: {
                                                title: 1,
                                                description: 1,
                                                views: 1,
                                                isPublished: 1,
                                                "videoFile.secure_url": 1,
                                                "thumbnail.secure_url": 1,
                                                duration: 1,
                                                createdAt: 1,
                                                updatedAt: 1,
                                                owner: {
                                                        userName: 1,
                                                        fullName: 1,
                                                        "avatar.secure_url": 1,
                                                },
                                        },
                                },
                        },
                ]);

                if (!likedVideosInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "LIKE CONTROLLER, GET LIKED VIDEOS, fetching liked videos failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.CREATED)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `LIKE CONTROLLER, GET LIKED VIDEOS, User ${userId} liked videos fetched successfully.`,
                                        likedVideosInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "LIKE CONTROLLER, GET LIKED VIDEOS, CATCH, An error occurred while fetching the liked videos.",
                        [error.message],
                        error.stack
                );
        }
});

export { getLikedVideos, toggleCommentLike, toggleVideoLike, toggleTweetLike };
