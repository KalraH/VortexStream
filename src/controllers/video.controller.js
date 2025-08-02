import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import Mongoose, { isValidObjectId } from "mongoose";
import { uploadOnCloud, deleteFromCloud } from "../utils/cloudinary.js";

/**
 * Get all videos as per the query, sort, pagination.
 * @route 	GET /
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing query options.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with uploaded videos data.
 */
const getAllVideos = asyncHandler(async (req, res) => {
        try {
                const {
                        page = 1,
                        limit = 10,
                        query,
                        sortBy,
                        sortType,
                        userId,
                } = req.query;

                const pipeline = [];

                // Seach on the basis of Title/Description by creating a Search-Index named "search-videos"
                if (query) {
                        pipeline.push({
                                $search: {
                                        index: "search-videos",
                                        text: {
                                                query: query,
                                                path: ["title", "description"],
                                        },
                                },
                        });
                }

                // Search for Owner of the video with User-ID
                if (userId) {
                        if (!isValidObjectId(userId)) {
                                throw new ApiError(
                                        HTTP_STATUS.NOT_ACCEPTABLE,
                                        "VIDEO CONTROLLER, GET ALL, User-ID is Invalid."
                                );
                        }

                        pipeline.push({
                                $match: {
                                        owner: new Mongoose.Types.ObjectId(
                                                userId
                                        ),
                                },
                        });
                }

                // Search for Published videos only
                pipeline.push({ $match: { isPublished: true } });

                // sortBy can be either of these (views, createdAt, duration)
                // sortType can be either ascending(-1) OR descending(1)
                if (sortBy && sortType) {
                        pipeline.push({
                                $sort: {
                                        [sortBy]: sortType === "asc" ? 1 : -1,
                                        _id: 1,
                                },
                        });
                } else {
                        pipeline.push({ $sort: { updatedAt: -1, _id: 1 } });
                }

                pipeline.push(
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "owner",
                                        pipeline: [
                                                {
                                                        $project: {
                                                                userName: 1,
                                                                fullName: 1,
                                                                "avatar.secure_url": 1,
                                                        },
                                                },
                                        ],
                                },
                        },
                        {
                                $unwind: "$owner",
                        }
                );

                const options = {
                        page: parseInt(page, 10),
                        limit: parseInt(limit, 10),
                };

                const collectedVideos = await Video.aggregatePaginate(
                        pipeline,
                        options
                );

                if (!collectedVideos) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, GET ALL, Error while Paginating Videos."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `VIDEO CONTROLLER, GET ALL, Videos fetched successfully.`,
                                        collectedVideos
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, GET ALL, CATCH, An error occurred while getting all videos.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Publish a new Video.
 * @route 	POST /
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing video details in Body.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with published video details.
 */
const publishAVideo = asyncHandler(async (req, res) => {
        try {
                const { title, description } = req.body;
                const videoLocalPath = req.files?.videoFile?.[0]?.path || null;
                const thumbnailLocalPath =
                        req.files?.thumbnail?.[0]?.path || null;

                if (
                        [
                                title,
                                description,
                                videoLocalPath,
                                thumbnailLocalPath,
                        ].some(
                                (f) =>
                                        !f ||
                                        typeof f !== "string" ||
                                        f.trim() === ""
                        )
                ) {
                        console.log(videoLocalPath);
                        console.log(thumbnailLocalPath);
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, PUBLISH, All fields are required (Title, Description, Video Path, Thumbnail Path) are needed."
                        );
                }

                const uploadedVideo = await uploadOnCloud(videoLocalPath);
                const uploadedThumbnail =
                        await uploadOnCloud(thumbnailLocalPath);

                if (!uploadedVideo) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, PUBLISH, Video upload Failed."
                        );
                }

                if (!uploadedThumbnail) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, PUBLISH, Thumbnail upload Failed."
                        );
                }

                const videoInstance = await Video.create({
                        title,
                        description,
                        videoFile: {
                                secure_url: uploadedVideo.secure_url,
                                public_id: uploadedVideo.public_id,
                        },
                        thumbnail: {
                                secure_url: uploadedThumbnail.secure_url,
                                public_id: uploadedThumbnail.public_id,
                        },
                        owner: req?.user?._id,
                        duration: uploadedVideo.duration,
                        isPublished: true,
                });

                if (!videoInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, PUBLISH, Video publishing failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `VIDEO CONTROLLER, PUBLISH, Video with ID ${videoInstance?._id} published successfully.`,
                                        videoInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, PUBLISH, CATCH, An error occurred while publishing the video.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get a specific video.
 * @route 	GET /:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with fetched video details.
 */
const getVideoById = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                if (!videoId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, GET, Video-ID is needed."
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, GET, Video-ID is Invalid."
                        );
                }

                const existingVideo = await Video.findById(videoId);
                if (!existingVideo) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "VIDEO CONTROLLER, GET, Video Not Found."
                        );
                }

                const userId = new Mongoose.Types.ObjectId(req?.user?._id);
                const videoInstance = await Video.aggregate([
                        // Getting video doc with given ID
                        {
                                $match: {
                                        _id: new Mongoose.Types.ObjectId(
                                                videoId
                                        ),
                                },
                        },
                        // Getting likes of the video
                        {
                                $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "video",
                                        as: "likes",
                                },
                        },
                        // Getting comments of the video
                        {
                                $lookup: {
                                        from: "comments",
                                        localField: "_id",
                                        foreignField: "video",
                                        as: "comments",
                                        pipeline: [
                                                {
                                                        $lookup: {
                                                                from: "users",
                                                                localField: "owner",
                                                                foreignField:
                                                                        "_id",
                                                                as: "vidOwner",
                                                        },
                                                },
                                                {
                                                        $addFields: {
                                                                vidOwner: {
                                                                        $first: "$vidOwner",
                                                                },
                                                        },
                                                },
                                                {
                                                        $project: {
                                                                content: 1,
                                                                createdAt: 1,
                                                                updatedAt: 1,
                                                                vidOwner: {
                                                                        userName: 1,
                                                                        fullName: 1,
                                                                        "avatar.secure_url": 1,
                                                                },
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Getting owner of the video
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "owner",
                                        pipeline: [
                                                {
                                                        $lookup: {
                                                                from: "subscriptions",
                                                                localField: "_id",
                                                                foreignField:
                                                                        "channel",
                                                                as: "subscribers",
                                                        },
                                                },
                                                {
                                                        $addFields: {
                                                                subscribersCount:
                                                                        {
                                                                                $size: "$subscribers",
                                                                        },
                                                                isSubscribed: {
                                                                        $cond: {
                                                                                if: {
                                                                                        $in: [
                                                                                                userId,
                                                                                                "$subscribers.subscriber",
                                                                                        ],
                                                                                },
                                                                                then: true,
                                                                                else: false,
                                                                        },
                                                                },
                                                        },
                                                },
                                                {
                                                        $project: {
                                                                userName: 1,
                                                                "avatar.secure_url": 1,
                                                                subscribersCount: 1,
                                                                isSubscribed: 1,
                                                        },
                                                },
                                        ],
                                },
                        },
                        // Adding necessary fields to return
                        {
                                $addFields: {
                                        likesCount: {
                                                $size: "$likes",
                                        },
                                        owner: {
                                                $first: "$owner",
                                        },
                                        isLiked: {
                                                $cond: {
                                                        if: {
                                                                $in: [
                                                                        userId,
                                                                        "$likes.likedBy",
                                                                ],
                                                        },
                                                        then: true,
                                                        else: false,
                                                },
                                        },
                                },
                        },
                        // Selecting the content to return
                        {
                                $project: {
                                        title: 1,
                                        description: 1,
                                        createdAt: 1,
                                        duration: 1,
                                        views: 1,
                                        isPublished: 1,
                                        "videoFile.secure_url": 1,
                                        "thumbnail.secure_url": 1,
                                        owner: 1,
                                        likesCount: 1,
                                        isLiked: 1,
                                        comments: 1,
                                },
                        },
                ]);

                if (!videoInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, GET, Video search failed."
                        );
                }

                // increment views if video fetched successfully
                await Video.findByIdAndUpdate(videoId, {
                        $inc: {
                                views: 1,
                        },
                });

                // add this video to user watch history
                await User.findByIdAndUpdate(req.user?._id, {
                        $addToSet: {
                                watchHistory: videoId,
                        },
                });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `VIDEO CONTROLLER, GET, Video with ID ${videoId} fetched successfully.`,
                                        videoInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, GET, CATCH, An error occurred while fetching the video.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Update an existing Video.
 * @route 	PATCH /:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object updated video details.
 */
const updateVideo = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                const { title, description } = req.body;
                const thumbnailLocalPath =
                        req.files?.thumbnail?.[0]?.path || null;

                if (
                        [videoId, title, description, thumbnailLocalPath].some(
                                (f) =>
                                        !f ||
                                        typeof f !== "string" ||
                                        f.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, UPDATE, All fields are required (Video-ID, Title, Description, Thumbnail Path) are needed."
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, UPDATE, Video-ID is Invalid."
                        );
                }

                const existingVideo = await Video.findById(videoId);
                if (!existingVideo) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "VIDEO CONTROLLER, UPDATE, Video Not Found."
                        );
                }

                if (
                        existingVideo.owner?.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "VIDEO CONTROLLER, UPDATE, user not Authorized to update this video."
                        );
                }

                const thumbnailToDelete = existingVideo.thumbnail.public_id;

                const newThumbnail = await uploadOnCloud(thumbnailLocalPath);
                if (!newThumbnail) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, UPDATE, Thumbnail updation failed."
                        );
                }

                const updatedVideo = await Video.findByIdAndUpdate(
                        existingVideo?._id,
                        {
                                $set: {
                                        title,
                                        description,
                                        thumbnail: {
                                                public_id: newThumbnail.public_id,
                                                secure_url: newThumbnail.secure_url,
                                        },
                                },
                        },
                        { new: true }
                );

                if (!updatedVideo) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, UPDATE, Video updation failed."
                        );
                }

                await deleteFromCloud(thumbnailToDelete);

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `VIDEO CONTROLLER, UPDATE, Video with ID ${videoId} updated successfully.`,
                                        updatedVideo
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, UPDATE, CATCH, An error occurred while updating the video.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Delete an existing Video.
 * @route 	DELETE /:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params for deletion.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with deleted video confirmation.
 */
const deleteVideo = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                if (!videoId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, DELETE, Video-ID is needed."
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, DELETE, Video-ID is Invalid."
                        );
                }

                const existingVideo = await Video.findById(videoId);
                if (!existingVideo) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "VIDEO CONTROLLER, DELETE, Video Not Found."
                        );
                }

                if (
                        existingVideo.owner?.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "VIDEO CONTROLLER, DELETE, user not Authorized to delete this video."
                        );
                }

                const deletedVideo = await Video.findByIdAndDelete(
                        existingVideo?._id
                );
                if (!deletedVideo) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, DELETE, video deletion failed."
                        );
                }

                await deleteFromCloud(existingVideo.videoFile.public_id);
                await deleteFromCloud(existingVideo.thumbnail.public_id);

                await Like.deleteMany({ video: existingVideo?._id });
                await Comment.deleteMany({ video: existingVideo?._id });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `VIDEO CONTROLLER, DELETE, Video deleted successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, DELETE, CATCH, An error occurred while deleting the video.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Toggle an existing Video's Publish status
 * @route 	POST /toggle/publish/:videoId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with video's publish status.
 */
const togglePublishStatus = asyncHandler(async (req, res) => {
        try {
                const { videoId } = req.params;
                if (!videoId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, TOGGLE, Video-Id is required."
                        );
                }

                if (!isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "VIDEO CONTROLLER, TOGGLE, Video ID Invalid."
                        );
                }

                const videoInstance = await Video.findById(videoId);
                if (!videoInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "VIDEO CONTROLLER, TOGGLE, Video not found."
                        );
                }

                if (
                        videoInstance.owner?.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "VIDEO CONTROLLER, TOGGLE, user not Authorized to toggle this video's Publish status."
                        );
                }

                const updatedVideo = await Video.findByIdAndUpdate(
                        videoInstance?._id,
                        {
                                $set: {
                                        isPublished: !videoInstance.isPublished,
                                },
                        },
                        { new: true }
                );

                if (!updatedVideo) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "VIDEO CONTROLLER, TOGGLE, Video publish status toggling failed."
                        );
                }

                return res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `VIDEO CONTROLLER, TOGGLE, Video ${updatedVideo?._id} publish status toggeled successfully.`,
                                {
                                        isPublished: updatedVideo.isPublished,
                                }
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "VIDEO CONTROLLER, TOGGLE, CATCH, An error occurred while Publish status toggling.",
                        [error.message],
                        error.stack
                );
        }
});

export {
        deleteVideo,
        getAllVideos,
        getVideoById,
        publishAVideo,
        togglePublishStatus,
        updateVideo,
};
