import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import Mongoose, { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
        const { name, description } = req.body;
});

const getUserPlaylists = asyncHandler(async (req, res) => {
        const { userId } = req.params;
});

const getPlaylistById = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
        const { playlistId, videoId } = req.params;
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
        const { playlistId, videoId } = req.params;
});

const deletePlaylist = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;
});

const updatePlaylist = asyncHandler(async (req, res) => {
        const { playlistId } = req.params;
        const { name, description } = req.body;
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
