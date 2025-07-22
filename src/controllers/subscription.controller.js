import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
        const { subscriberId } = req.params;
});

export { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription };
