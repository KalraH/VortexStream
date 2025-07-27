import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";

/**
 * Create a new Playlist.
 * @route 	POST /
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing new Playlist data in Body.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with new created playlist.
 */
const createPlaylist = asyncHandler(async (req, res) => {
        try {
                const { name, description } = req.body;
                if ([name, description].some((field) => field?.trim() === "")) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, CREATE, All fields are required.",
                                [error.message],
                                error.stack
                        );
                }

                const newPlaylist = await Playlist.create({
                        name,
                        description,
                        owner: req?.user?._id,
                });
                if (!newPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "PLAYLIST CONTROLLER, CREATE, Error while creating playlist.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `PLAYLIST CONTROLLER, CREATE, Playlist by User ${newPlaylist.owner} created successfully.`,
                                        newPlaylist
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, CREATE, CATCH, An error occurred while creating the playlist.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get user's playlists.
 * @route 	GET /user/:userId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing User-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with user's all Playlist Data.
 */
const getUserPlaylists = asyncHandler(async (req, res) => {
        try {
                const { userId } = req.params;
                if (!userId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, GET USR PLAYLIST, User-ID is needed.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(userId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, GET USR PLAYLIST, User-ID is Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const playlistInstance = await Playlist.aggregate([
                        // Getting all playlist docs with owner as User with User-ID
                        {
                                $match: {
                                        owner: Mongoose.Types.ObjectId(userId),
                                },
                        },
                        // Getting all videos of playlist
                        {
                                $lookup: {
                                        from: "videos",
                                        localField: "videos",
                                        foreignField: "_id",
                                        as: "videos",
                                },
                        },
                        // Addring necessary fields to return
                        {
                                $addFields: {
                                        totalVideos: {
                                                $size: "$videos",
                                        },
                                        $totalViews: {
                                                $sum: "videos.views",
                                        },
                                },
                        },
                        // Selecting the content to return
                        {
                                $project: {
                                        totalVideos: 1,
                                        totalViews: 1,
                                        name: 1,
                                        description: 1,
                                        createdAt: 1,
                                        videos: 1,
                                        owner: 1,
                                },
                        },
                ]);

                if (!playlistInstance) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, GET USR PLAYLIST, Playlists not found.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `PLAYLIST CONTROLLER, GET USR PLAYLISTS, Playlists of user ${userId} fetched successfully.`,
                                        playlistInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, GET USR PLAYLISTS, CATCH, An error occurred while fetching user playlists.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get a specific playlist by ID.
 * @route 	GET /:playlistId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Playlist-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with all Channel Content (Stats).
 */
const getPlaylistById = asyncHandler(async (req, res) => {
        try {
                const { playlistId } = req.params;
                if (!playlistId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, GET PLAYLIST, Playlist-ID is needed.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(playlistId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, GET PLAYLIST, Playlist-ID is Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const existingPlaylist = await Playlist.findById(playlistId);
                if (!existingPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, GET PLAYLIST, Playlist Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                const playlistInstance = await Playlist.aggregate([
                        // Getting playlist doc with given ID
                        {
                                $match: {
                                        _id: Mongoose.Types.ObjectId(
                                                playlistId
                                        ),
                                },
                        },
                        // Getting all videos of playlist
                        {
                                $lookup: {
                                        from: "videos",
                                        localField: "videos",
                                        foreignField: "_id",
                                        as: "videos",
                                },
                        },
                        // Finding all the published videos only
                        {
                                $match: {
                                        isPublished: true,
                                },
                        },
                        // Getting owner of the playlist
                        {
                                $lookup: {
                                        from: "users",
                                        localField: "owner",
                                        foreignField: "_id",
                                        as: "owner",
                                },
                        },
                        // Addring necessary fields to return
                        {
                                $addFields: {
                                        totalVideos: {
                                                $size: "$videos",
                                        },
                                        $totalViews: {
                                                $sum: "videos.views",
                                        },
                                        owner: {
                                                $first: "$owner",
                                        },
                                },
                        },
                        // Selecting the content to return
                        {
                                $project: {
                                        name: 1,
                                        description: 1,
                                        createdAt: 1,
                                        updatedAt: 1,
                                        totalViews: 1,
                                        totalVideos: 1,
                                        videos: {
                                                "videoFile.secure_url": 1,
                                                "thumbnail.secure_url": 1,
                                                title: 1,
                                                description: 1,
                                                duration: 1,
                                                views: 1,
                                                isPublished: 1,
                                                createdAt: 1,
                                        },
                                        owner: {
                                                userName: 1,
                                                fullName: 1,
                                                "avatar.secure_url": 1,
                                        },
                                },
                        },
                ]);

                if (!playlistInstance) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "PLAYLIST CONTROLLER, GET PLAYLIST, Playlist search failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `PLAYLIST CONTROLLER, GET PLAYLIST, Playlist with ID ${playlistId} fetched successfully.`,
                                        playlistInstance
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, GET PLAYLIST, CATCH, An error occurred while fetching the playlist.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Add a video into a playlist.
 * @route 	PATCH /add/:videoId/:playlistId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID & Playlist-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with video addition confirmation.
 */
const addVideoToPlaylist = asyncHandler(async (req, res) => {
        try {
                const { playlistId, videoId } = req.params;
                if (
                        [playlistId, videoId].some(
                                (field) => field?.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, ADD VIDEO, Both Playlist-ID & Playlist-ID are needed.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, ADD VIDEO, Playlist-ID or Video-ID are Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const existingVideo = await Video.findById(videoId);
                if (!existingVideo) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, ADD VIDEO, Video Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                const existingPlaylist = await Playlist.findById(playlistId);
                if (!existingPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, ADD VIDEO, Playlist Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        (existingVideo.owner?.toString() &&
                                existingPlaylist.owner?.toString()) !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "PLAYLIST CONTROLLER, ADD VIDEO, user not Authorized to add this video into playlist.",
                                [error.message],
                                error.stack
                        );
                }

                const updatedPlaylist = await Playlist.findByIdAndUpdate(
                        existingPlaylist?._id,
                        {
                                $addToSet: {
                                        videos: existingVideo?._id,
                                },
                        },
                        { new: true }
                );

                if (!updatedPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "PLAYLIST CONTROLLER, ADD VIDEO, Playlist updation failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `PLAYLIST CONTROLLER, ADD VIDEO, Video added into playlist successfully.`,
                                        updatedPlaylist
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, ADD VIDEO, CATCH, An error occurred while adding video.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Remove a vidio from a Playlist.
 * @route 	PATCH /remove/:videoId/:playlistId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Video-ID & Playlist-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with Video deletion from playlist confirmation.
 */
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
        try {
                const { playlistId, videoId } = req.params;
                if (
                        [playlistId, videoId].some(
                                (field) => field?.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, Both Playlist-ID & Playlist-ID are needed.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, Playlist-ID or Video-ID are Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const existingVideo = await Video.findById(videoId);
                if (!existingVideo) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, Video Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                const existingPlaylist = await Playlist.findById(playlistId);
                if (!existingPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, Playlist Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        (existingVideo.owner?.toString() &&
                                existingPlaylist.owner?.toString()) !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, user not Authorized to remove this video from playlist.",
                                [error.message],
                                error.stack
                        );
                }

                const updatedPlaylist = await Playlist.findByIdAndUpdate(
                        existingPlaylist?._id,
                        {
                                $pull: {
                                        videos: existingVideo?._id,
                                },
                        },
                        { new: true }
                );

                if (!updatedPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, Video removal failed.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `PLAYLIST CONTROLLER, REMOVE VIDEO, Video removed from playlist successfully.`,
                                        updatedPlaylist
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, REMOVE VIDEO, CATCH, An error occurred while video removal.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Deleting an entire Playlist.
 * @route 	DELETE /:playlistId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Playlist-ID in params for deletion.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with Playlist deletion confirmation.
 */
const deletePlaylist = asyncHandler(async (req, res) => {
        try {
                const { playlistId } = req.params;
                if (!playlistId) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, DELETE, Playlist-ID is needed.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(playlistId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, DELETE, Playlist-ID is Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const existingPlaylist = await Playlist.findById(playlistId);
                if (!existingPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, DELETTE, Playlist Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        existingPlaylist.owner?.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "PLAYLIST CONTROLLER, DELETE, user not Authorized to delete this playlist.",
                                [error.message],
                                error.stack
                        );
                }

                await Playlist.findByIdAndDelete(existingPlaylist?._id);

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `PLAYLIST CONTROLLER, DELETE, Playlist deleted successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, DELETE, CATCH, An error occurred while deletion.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Updating a playlist.
 * @route 	PATCH /:playlistId
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing Playlist-ID in params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with updated Playlist details.
 */
const updatePlaylist = asyncHandler(async (req, res) => {
        try {
                const { playlistId } = req.params;
                const { name, description } = req.body;
                if (
                        [name, description, playlistId].some(
                                (field) => field?.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, UPDATE, All fields (Name, Description, Playlist-ID) are required.",
                                [error.message],
                                error.stack
                        );
                }

                if (!isValidObjectId(playlistId)) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "PLAYLIST CONTROLLER, UPDATE, Playlist-ID is Invalid.",
                                [error.message],
                                error.stack
                        );
                }

                const existingPlaylist = await Playlist.findById(playlistId);
                if (!existingPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "PLAYLIST CONTROLLER, UPDATE, Playlist Not Found.",
                                [error.message],
                                error.stack
                        );
                }

                if (
                        existingPlaylist.owner?.toString() !==
                        req?.user?._id.toString()
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "PLAYLIST CONTROLLER, UPDATE, user not Authorized to update this playlist.",
                                [error.message],
                                error.stack
                        );
                }

                const updatedPlaylist = await Playlist.findByIdAndUpdate(
                        existingPlaylist?._id,
                        {
                                $set: {
                                        name,
                                        description,
                                },
                        },
                        { new: true }
                );
                if (!updatedPlaylist) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "PLAYLIST CONTROLLER, UPDATE, Error while updating playlist.",
                                [error.message],
                                error.stack
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `PLAYLIST CONTROLLER, UPDATE, Playlist by User ${updatedPlaylist.owner} updated successfully.`,
                                        updatedPlaylist
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "PLAYLIST CONTROLLER, UPDATE, CATCH, An error occurred while updation.",
                        [error.message],
                        error.stack
                );
        }
});

export {
        addVideoToPlaylist,
        createPlaylist,
        deletePlaylist,
        getPlaylistById,
        getUserPlaylists,
        removeVideoFromPlaylist,
        updatePlaylist,
};
