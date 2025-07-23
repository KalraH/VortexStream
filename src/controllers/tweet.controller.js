import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Tweet } from "../models/tweet.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

/**
 * Creating a new Tweet for posting via an existing user.
 * @route 	POST /
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Tweet details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the created tweet details.
 */
const createTweet = asyncHandler(async (req, res) => {
        try {
                const { content } = req.body;
                if (!content) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "TWEET CONTROLLER, CREATE TWEET, Tweet content is required.",
                                [error.message],
                                error.stack
                        );
                }

                const tweetInstance = new Tweet.create({
                        content,
                        owner: req?.user?._id,
                });
                if (!tweetInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "TWEET CONTROLLER, CREATE TWEET, Tweet creation failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.CREATED)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `TWEET CONTROLLER, CREATE TWEET, User ${tweetInstance.owner} tweet created successfully.`,
                                        tweetInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "TWEET CONTROLLER, CREATE TWEET, CATCH, An error occurred while creating the tweet.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Getting all Tweets posted via user with given User-ID.
 * @route 	GET /user/:userId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Tweet's owner-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all the tweets posted by the user.
 */
const getUserTweets = asyncHandler(async (req, res) => {
        try {
                const { userId } = req.params;
                if (!userId) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "TWEET CONTROLLER, GET USR TWEETS, User ID is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(userId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "TWEET CONTROLLER, GET USR TWEETS, User ID Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const viewerUserId = req?.user?._id;
                const tweetInstance = await Tweet.aggregate([
                        // Getting All tweets with Owner as User of UserId
                        {
                                $match: {
                                        owner: mongoose.Types.ObjectId(userId),
                                },
                        },
                        // Getting Owner/User Details from User Model
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "ownerDetails",
                                        pipeline: [
                                                {
                                                        $project: {
                                                                userName: 1,
                                                                fullName: 1,
                                                                avatar: 1,
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Getting Likes on this tweet from Likes Model
                        {
                                $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "tweet",
                                        as: "likesDetails",
                                        pipeline: [
                                                {
                                                        $project: {
                                                                likedBy: 1,
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Add newly fetched/calculated fields
                        {
                                $addFields: {
                                        likesCount: {
                                                $size: "$likesDetails",
                                        },
                                        ownerDetails: {
                                                $first: "$ownerDetails",
                                        },
                                        isLikedByUser: {
                                                $cond: {
                                                        if: {
                                                                $in: [
                                                                        viewerUserId,
                                                                        "$likesDetails.likedBy",
                                                                ],
                                                        },
                                                        then: true,
                                                        else: false,
                                                },
                                        },
                                },
                        },
                        // Sorting Tweets based on Latest Updated/Created
                        {
                                $sort: {
                                        updatedAt: -1,
                                },
                        },
                        // Collect final data to-be sent
                        {
                                $project: {
                                        ownerDetails: 1,
                                        content: 1,
                                        likesCount: 1,
                                        createdAt: 1,
                                        updatedAt: 1,
                                        isLikedByUser: 1,
                                },
                        },
                ]);

                if (!tweetInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "TWEET CONTROLLER, GET USR TWEETS, Tweet collection failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `TWEET CONTROLLER, GET USR TWEETS, User ${tweetInstance.owner} tweets fetched successfully.`,
                                        tweetInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "TWEET CONTROLLER, GET USR TWEETS, CATCH, An error occurred while getting the tweets.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Updating an existing Tweet posted via an existing user.
 * @route 	PATCH /:tweetId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Tweet content in Body and Tweet-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the updated tweet details.
 */
const updateTweet = asyncHandler(async (req, res) => {
        try {
                const { content } = req.body;
                const { tweetId } = req.params;
                if (!content) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "TWEET CONTROLLER, UPDATE TWEET, Tweet content is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!tweetId) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "TWEET CONTROLLER, UPDATE TWEET, Tweet ID is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(tweetId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "TWEET CONTROLLER, UPDATE TWEET, Tweet ID Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                const tweetInstance = await Tweet.findById(tweetId);
                if (!tweetInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "TWEET CONTROLLER, UPDATE TWEET, Tweet not found.",
                                [error.message],
                                error.stack
                        );
                }

                // Print and validate below fields before testing
                if (
                        tweetInstance?.owner.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "TWEET CONTROLLER, UPDATE TWEET, User not Authorized to update the tweet.",
                                [error.message],
                                error.stack
                        );
                }

                const newTweetInstance = await Tweet.findByIdAndUpdate(
                        tweetId,
                        { $set: content },
                        { new: true }
                );
                if (!newTweetInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "TWEET CONTROLLER, UPDATE TWEET, unable to update the tweet.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `TWEET CONTROLLER, UPDATE TWEET, User ${newTweetInstance.owner} tweet updated successfully.`,
                                        newTweetInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "TWEET CONTROLLER, UPDATE TWEET, CATCH, An error occurred while updating the tweet.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Deleting an existing Tweet posted via an existing user.
 * @route 	DELETE /:tweetId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Tweet-ID in Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the tweet delete confirmation.
 */
const deleteTweet = asyncHandler(async (req, res) => {
        try {
                const { tweetId } = req.params;
                if (!tweetId) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "TWEET CONTROLLER, DELETE TWEET, Tweet ID is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(tweetId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "TWEET CONTROLLER, DELETE TWEET, Tweet ID Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                const tweetInstance = await Tweet.findById(tweetId);
                if (!tweetInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "TWEET CONTROLLER, DELETE TWEET, Tweet not found.",
                                [error.message],
                                error.stack
                        );
                }

                // Print and validate below fields before testing
                if (
                        tweetInstance?.owner.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "TWEET CONTROLLER, DELETE TWEET, User not Authorized to delete the tweet.",
                                [error.message],
                                error.stack
                        );
                }

                await Tweet.findByIdAndDelete(tweetId);

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `TWEET CONTROLLER, DELETE TWEET, User ${req?.user?._id} tweet deleted successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "TWEET CONTROLLER, DELETE TWEET, CATCH, An error occurred while deleting the tweet.",
                        [error.message],
                        error.stack
                );
        }
});

export { createTweet, deleteTweet, getUserTweets, updateTweet };
