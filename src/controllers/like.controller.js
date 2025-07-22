import ApiError from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
});

const toggleCommentLike = asyncHandler(async (req, res) => {
        const { commentId } = req.params;
});

const toggleTweetLike = asyncHandler(async (req, res) => {
        const { tweetId } = req.params;
});

const getLikedVideos = asyncHandler(async (req, res) => {
});

export { getLikedVideos, toggleCommentLike, toggleVideoLike, toggleTweetLike };
