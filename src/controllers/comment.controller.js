import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
});

const updateComment = asyncHandler(async (req, res) => {
});

const deleteComment = asyncHandler(async (req, res) => {
});

export { addComment, deleteComment, updateComment, getVideoComments };
