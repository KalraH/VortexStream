import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";

/**
 * Informing regarding Togglling Subscription Icon for users.
 * @route 	POST /c/:channelId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing channel-ID (Technically User-ID as channel is also a user) in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with flag regarding togglling subscription icon.
 */
const toggleSubscription = asyncHandler(async (req, res) => {
        try {
                const { channelId } = req.params;
                if (!channelId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, TOGGLE SUBSCRIPTION, Channel-Id is required."
                        );
                }

                if (!isValidObjectId(channelId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, TOGGLE SUBSCRIPTION, Channel ID Invalid."
                        );
                }

                const subscriptionInstance = await Subscription.findOne({
                        subsciber: req?.user?._id,
                        channel: channelId,
                });
                if (subscriptionInstance) {
                        await Subscription.findByIdAndDelete(
                                subscriptionInstance?._id
                        );

                        return res
                                .status(HTTP_STATUS.OK)
                                .json(
                                        new ApiResponse(
                                                HTTP_STATUS.OK,
                                                `SUBSCRIPTION CONTROLLER, TOGGLE SUBSCRIPTION, Channel ${channelId} Un-Subscribed successfully.`,
                                                { isSubscribed: false }
                                        )
                                );
                }

                await Subscription.create({
                        subsciber: req?.user?._id,
                        channel: channelId,
                });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `SUBSCRIPTION CONTROLLER, TOGGLE SUBSCRIPTION, Channel ${channelId} Subscribed successfully.`,
                                        { isSubscribed: true }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "SUBSCRIPTION CONTROLLER, TOGGLE SUBSCRIPTION, CATCH, An error occurred while toggeling subscription status.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get all user-channel's Subscribers.
 * @route 	GET /u/:subscriberId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing channel-ID (Technically User-ID as channel is also a user) in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with user's channel Subscribers.
 */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
        try {
                const { channelId } = req.params;
                if (!channelId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, GET USR CHANNEL SUBSCRIBERS, Channel-Id is required."
                        );
                }

                if (!isValidObjectId(channelId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, GET USR CHANNEL SUBSCRIBERS, Channel ID Invalid."
                        );
                }

                channelId = Mongoose.Types.ObjectId(channelId);
                const subscribers = await Subscription.aggregate([
                        // Getting all Subuscription docs where channels are channel-ID (User-IDs of users who have subscribed to this channel).
                        {
                                $match: {
                                        channel: channelId,
                                },
                        },
                        // Getting Subscriber details from Users Schema
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "subscriber",
                                        foreignField: "_id",
                                        as: "subscriber",
                                        pipeline: [
                                                // People/Users subscribed to this channel (like followers)
                                                {
                                                        $lookup: {
                                                                from: "subscriptions",
                                                                localField: "_id",
                                                                foreignField:
                                                                        "channel",
                                                                as: "subscribedToSubscriber",
                                                        },
                                                },
                                                {
                                                        $addFields: {
                                                                subscribedToSubscriber:
                                                                        {
                                                                                // Checks: "Is the given channel-ID one of the followers of this subscriber?"
                                                                                $cond: {
                                                                                        if: {
                                                                                                $in: [
                                                                                                        channelId,
                                                                                                        "$subscribedToSubscriber.subscriber",
                                                                                                ],
                                                                                        },
                                                                                        then: true,
                                                                                        else: false,
                                                                                },
                                                                        },
                                                                subscribersCount:
                                                                        {
                                                                                $size: "$subscribedToSubscriber",
                                                                        },
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Flattening the lookup array
                        {
                                $unwind: "$subscriber",
                        },
                        // Selecting the necessary fields to send ahead
                        {
                                $project: {
                                        _id: 0,
                                        subsciber: {
                                                userName: 1,
                                                fullName: 1,
                                                "avatar.secured_url": 1,
                                                subscribedToSubscriber: 1,
                                                subscribersCount: 1,
                                        },
                                },
                        },
                ]);
                if (!subscribers) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "SUBSCRIPTION CONTROLLER, GET USR CHANNEL SUBSCRIBERS, Subscribers fetching failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `SUBSCRIPTION CONTROLLER, GET USR CHANNEL SUBSCRIBERS, Channel ${req.params} Subscribers fetched successfully.`,
                                        subscribers
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "SUBSCRIPTION CONTROLLER, GET USR CHANNEL SUBSCRIBERS, CATCH, An error occurred while gathering user channel subscribers.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get channel list to which user has Subscribed-To.
 * @route 	GET /c/:channelId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing subscriber-ID (User-ID of subscriber) in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with count of channel user has Subscriber-To.
 */
const getSubscribedChannels = asyncHandler(async (req, res) => {
        try {
                const { subscriberId } = req.params;
                if (!subscriberId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, GET USR SUBSCRIBED CHANNELS, Subscriber-Id is required."
                        );
                }

                if (!isValidObjectId(subscriberId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "SUBSCRIPTION CONTROLLER, GET USR SUBSCRIBED CHANNELS, Subscriber ID Invalid."
                        );
                }

                const subscribedChannels = await Subscription.aggregate([
                        // Getting all Subuscription docs where Subscriber/user are subscriber-ID (user (subscriberId) is the subscriber).
                        {
                                $match: {
                                        subsciber: Mongoose.Types.ObjectId(
                                                subscriberId
                                        ),
                                },
                        },
                        // Gathering Subscribed Channel details and their latest posted video
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "channel",
                                        foreignField: "_id",
                                        as: "subscribedChannel",
                                        pipeline: [
                                                // Getting the video doc list where the user/channel is owner (Channe's Video List)
                                                {
                                                        $lookup: {
                                                                from: "videos",
                                                                localField: "_id",
                                                                foreignField:
                                                                        "owner",
                                                                as: "videos",
                                                        },
                                                },
                                                // Picking the last video of this channel
                                                {
                                                        $addFields: {
                                                                lastVideo: {
                                                                        $last: "$videos",
                                                                },
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Flattening the lookup array
                        {
                                $unwind: "$subscribedChannel",
                        },
                        // Selecting the necessary fields to send ahead
                        {
                                $project: {
                                        _id: 0,
                                        subscribedChannel: {
                                                userName: 1,
                                                fullName: 1,
                                                "avatar.secued_url": 1,
                                                createdAt: 1,
                                                latestVideo: {
                                                        "videoFile.secued_url": 1,
                                                        "thumbnail.secued_url": 1,
                                                        description: 1,
                                                        title: 1,
                                                        duration: 1,
                                                        views: 1,
                                                        createdAt: 1,
                                                },
                                        },
                                },
                        },
                ]);

                if (!subscribedChannels) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "SUBSCRIPTION CONTROLLER, GET USR SUBSCRIBED CHANNELS, channels fetching failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `SUBSCRIPTION CONTROLLER, GET USR SUBSCRIBED CHANNELS, Subscriber ${subscriberId} channels fetched successfully.`,
                                        subscribedChannels
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "SUBSCRIPTION CONTROLLER, GET USR SUBSCRIBED CHANNELS, CATCH, An error occurred while gathering user Subscribed channels.",
                        [error.message],
                        error.stack
                );
        }
});

export { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription };
