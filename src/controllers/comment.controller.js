import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import Mongoose, { isValidObjectId } from "mongoose";

/**
 * Get all Video Comments.
 * @route 	GET /:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params & Paginate options in query.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all Video Comments.
 */
const getVideoComments = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                const { page = 1, limit = 10 } = req.query;

                // console.log("COMMENT CONTROLLER,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(req.query);
                // console.log("COMMENT CONTROLLER,", "TESTING LOGGING END ----------------------------------------------------------------");

                if (!videoId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, GET VIDEO COMMENTS, Video-ID is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, GET VIDEO COMMENTS, Video ID Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const videoInstance = await Video.findById(videoId);
                if (!videoInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "COMMENT CONTROLLER, GET VIDEO COMMENTS, Video data not found.",
                                [error.message],
                                error.stack
                        );
                }

                const videoComments = await Comment.aggregate([
                        // Gather all comments for given Video-ID
                        {
                                $match: {
                                        video: Mongoose.Types.ObjectId(videoId),
                                },
                        },
                        // Gather Comment Owner details
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "owner",
                                },
                        },
                        // Gather commnet Likes.
                        {
                                $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "comment",
                                        as: "likes",
                                },
                        },
                        // Create new fields as per requirements
                        {
                                $addFields: {
                                        likesCount: { $size: "$likes" },
                                        owner: { $first: "$owner" },
                                        isLiked: {
                                                $cond: {
                                                        if: [
                                                                req?.user?._id,
                                                                "$likes.likedBy",
                                                        ],
                                                        then: true,
                                                        else: false,
                                                },
                                        },
                                },
                        },
                        // Sorting comments in order of latest first.
                        {
                                $sort: { createdAt: -1 },
                        },
                        {
                                $project: {
                                        content: 1,
                                        createdAt: 1,
                                        upadtedAt: 1,
                                        owner: {
                                                userName: 1,
                                                fullName: 1,
                                                "avatar.secured_url": 1,
                                        },
                                        likesCount: 1,
                                        isLiked: 1,
                                },
                        },
                ]);

                const options = {
                        page: parseInt(page, 10),
                        limit: parseInt(limit, 10),
                };

                const commentsAggegate = await Comment.aggregatePaginate(
                        videoComments,
                        options
                );

                if (!commentsAggegate) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "COMMENT CONTROLLER, GET VIDEO COMMENTS, Comment gathering failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `COMMENT CONTROLLER, GET VIDEO COMMENTS, Video ${videoId} comments gathered successfully.`,
                                        commentsAggegate
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "COMMENT CONTROLLER, GET VIDEO COMMENTS, CATCH, An error occurred while gathering video comments.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Create a comment on a video.
 * @route 	POST /:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params & comment content in Body.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with new Comment details.
 */
const addComment = asyncHandler(async (req, res) => {
        try {
                const videoId = req?.params;
                const { content } = req?.body;

                if ([videoId, content].some((field) => field?.trim() === "")) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, ADD COMMENT, Both  video-ID and comment content are required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, ADD COMMENT, Video ID Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const videoInstance = await Video.findById(videoId);
                if (!videoInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "COMMENT CONTROLLER, ADD COMMENT, Video data not found.",
                                [error.message],
                                error.stack
                        );
                }

                const newCommentInstance = await Comment.create({
                        content,
                        video: videoInstance._id,
                        owner: req?.user?.id,
                });

                if (!newCommentInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "COMMENT CONTROLLER, ADD COMMENT, Comment creation failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `COMMENT CONTROLLER, ADD COMMENT, User ${req?.user?._id} comment created successfully on video ${videoId}.`,
                                        newCommentInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "COMMENT CONTROLLER, ADD COMMENT, CATCH, An error occurred while creating comment.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Update a comment on a video.
 * @route 	PATCH /c/:commentId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Comment-ID in params & comment content in Body..
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with updated Comment details.
 */
const updateComment = asyncHandler(async (req, res) => {
        try {
                const commentId = req?.params;
                const { content } = req?.body;

                if (
                        [commentId, content].some(
                                (field) => field?.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, UPDATE COMMENT, Both comment-ID and comment content are required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(commentId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, UPDATE COMMENT, Comment ID Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const commentInstance = await Comment.findById(commentId);
                if (!commentInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "COMMENT CONTROLLER, UPDATE COMMENT, Comment NOT FOUND.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        commentInstance.owner.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "COMMENT CONTROLLER, UPDATE COMMENT, User not Authorized to update the Comment.",
                                [error.message],
                                error.stack
                        );
                }

                const updatedCommentInstance = await Comment.findByIdAndUpdate(
                        commentInstance?._id,
                        { $set: content },
                        { new: true }
                );

                if (!updatedCommentInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "COMMENT CONTROLLER, UPDATE COMMENT, Comment updation failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `COMMENT CONTROLLER, UPDATE COMMENT, User ${updatedCommentInstance.owner} comment updated successfully on video ${updatedCommentInstance.video}.`,
                                        updatedCommentInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "COMMENT CONTROLLER, UPDATE COMMENT, CATCH, An error occurred while updating comment.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Delete a comment on a video.
 * @route 	DELETE /c/:commentId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Comment-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with confirmation of Comment deletion in DB.
 */
const deleteComment = asyncHandler(async (req, res) => {
        try {
                const commentId = req?.params;
                if (!commentId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, DELETE COMMENT, comment-ID is required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(commentId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "COMMENT CONTROLLER, DELETE COMMENT, Comment ID Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const commentInstance = await Comment.findById(commentId);
                if (!commentInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "COMMENT CONTROLLER, DELETE COMMENT, Comment NOT FOUND.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        commentInstance.owner.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "COMMENT CONTROLLER, DELETE COMMENT, User not Authorized to delete the Comment.",
                                [error.message],
                                error.stack
                        );
                }

                await Comment.findByIdAndDelete(commentInstance?._id);
                await Like.deleteMany({ comment: commentId });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `COMMENT CONTROLLER, DELETE COMMENT, User ${req?.user?._id} comment and all associated likes to this comment deleted successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "COMMENT CONTROLLER, DELETE COMMENT, CATCH, An error occurred while deleting comment.",
                        [error.message],
                        error.stack
                );
        }
});

export { addComment, deleteComment, updateComment, getVideoComments };
