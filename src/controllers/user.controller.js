import fs from "fs";
import jwt from "jsonwebtoken";
import Mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { HTTP_STATUS, COOKIE_OPTIONS } from "../constants.js";
import { uploadOnCloud, deleteFromCloud } from "../utils/cloudinary.js";

/**
 * Generate Refresh and Access Tokens.
 * @param 	{Object} user - User's Instance from DB.
 *
 * @returns 	{Object} The Refresh and Access Tokens created.
 */
const generateAccessRefreshToken = async (user) => {
        try {
                const accessToken = user.generateAccessToken();
                if (!accessToken) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, GEN ACC REF TOKEN, Access token generation failed."
                        );
                }

                const refreshToken = user.generateRefreshToken();
                if (!refreshToken) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, GEN ACC REF TOKEN, Refresh token generation failed."
                        );
                }

                user.refreshToken = refreshToken;
                await user.save({ validateBeforeSave: false });

                return { accessToken, refreshToken };
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, GEN ACC REF TOKEN, CATCH, An error occurred while generating tokens.",
                        [error.message],
                        error.stack
                );
        }
};

/**
 * Registers a new user.
 * @route 	POST /register
 * @access 	Public
 *
 * @param 	{Object} req - The request object containing user details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the created user details.
 */
const registerUser = asyncHandler(async (req, res) => {
        try {
                const { userName, email, password, fullName } = req.body;

                if (
                        [userName, email, password, fullName].some(
                                (field) =>
                                        !field ||
                                        typeof field !== "string" ||
                                        field.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "USER CONTROLLER, REGISTER, All fields are required."
                        );
                }

                const existingUser = await User.findOne({
                        $or: [{ userName }, { email }],
                });

                if (existingUser) {
                        throw new ApiError(
                                HTTP_STATUS.CONFLICT,
                                "USER CONTROLLER, REGISTER, User with this email already exists."
                        );
                }

                const avatarLocalPath = req.files?.avatar?.[0]?.path || null;
                const coverImageLocalPath =
                        req.files?.coverImage?.[0]?.path || null;

                if (!avatarLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, REGISTER, Avatar file path is missing."
                        );
                }

                const avatar = await uploadOnCloud(avatarLocalPath);
                const coverImage = await uploadOnCloud(coverImageLocalPath);

                if (!avatar) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, REGISTER, Avatar did't get upload to Cloudinary."
                        );
                }

                const newUser = await User.create({
                        userName,
                        email,
                        password,
                        fullName,
                        avatar: {
                                secure_url: avatar.secure_url,
                                public_id: avatar.public_id,
                        },
                        coverImage: {
                                secure_url: coverImage?.secure_url || null,
                                public_id: coverImage?.public_id || null,
                        },
                });

                const createdUser = await User.findById(newUser?._id).select(
                        "-password -refreshToken -__v"
                );

                if (!createdUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, REGISTER, User Creation failed."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.CREATED,
                                        `USER CONTROLLER, REGISTER, User {${createdUser._id}: ${createdUser.userName}} registered successfully.`,
                                        createdUser
                                )
                        );
        } catch (error) {
                // Clean up the file if upload fails
                if (req.files?.avatar?.[0]?.path) {
                        fs.unlinkSync(req.files.avatar[0].path);
                }
                if (req.files?.coverImage?.[0]?.path) {
                        fs.unlinkSync(req.files.coverImage[0].path);
                }

                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, REGISTER, CATCH, An error occurred while registering the user.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Login an existing user.
 * @route 	POST /login
 * @access 	Public
 *
 * @param 	{Object} req - The request object containing user credential for Login.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the logged user details and Access/refresh Tokens.
 */
const loginUser = asyncHandler(async (req, res) => {
        try {
                const { email, userName, password } = req.body;

                if ((!email && !userName) || !password) {
                        throw new ApiError(
                                HTTP_STATUS.PARTIAL_CONTENT,
                                "USER CONTROLLER, LOGIN, (Email or UserName) and password are required."
                        );
                }

                const userInstance = await User.findOne({
                        $or: [{ email }, { userName }],
                }).select("+password +refreshToken");

                if (
                        !userInstance ||
                        !(await userInstance.comparePassword(password))
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, LOGIN, Invalid email or password."
                        );
                }

                const { accessToken, refreshToken } =
                        await generateAccessRefreshToken(userInstance);

                return res
                        .status(HTTP_STATUS.OK)
                        .cookie("accessToken", accessToken, COOKIE_OPTIONS)
                        .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.ACCEPTED,
                                        `USER CONTROLLER, LOGIN, User {${userInstance._id}: ${userInstance.userName}} logged in successfully.`,
                                        {
                                                user: userInstance,
                                                accessToken,
                                                refreshToken,
                                        }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGIN, CATCH, An error occurred while logging in the user.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Logout a logged-in user.
 * @route 	POST /logout
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user details added via Auth middleware.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the logged-out user details.
 */
const logoutUser = asyncHandler(async (req, res) => {
        try {
                const userInstance = await User.findByIdAndUpdate(
                        req.user?._id,
                        { $unset: { refreshToken: 1 } },
                        { new: true }
                );

                return res
                        .status(HTTP_STATUS.OK)
                        .clearCookie("accessToken", COOKIE_OPTIONS)
                        .clearCookie("refreshToken", COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `USER CONTROLLER, LOGOUT, User {${userInstance._id}: ${userInstance.userName}} logged out successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGOUT, CATCH, An error occurred while logging out the user.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Re-generate Access & Refresh Tokens after validating the current Refresh Token.
 * @route 	POST /refresh-token
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing cookies with user refresh token.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the updated user details & Access/Refresh Tokens.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
        try {
                const token =
                        req.cookies?.refreshToken || req.body?.refreshToken;
                if (!token) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Token not provided."
                        );
                }

                const decodedToken = jwt.verify(
                        token,
                        process.env.REFRESH_TOKEN_SECRET
                );

                const userInstance = await User.findById(
                        decodedToken?._id
                ).select("+refreshToken");
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Invalid token provided."
                        );
                }

                if (token !== userInstance.refreshToken) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Refresh Token is Expired or Invalid."
                        );
                }

                const { accessToken, refreshToken } =
                        await generateAccessRefreshToken(userInstance);

                return res
                        .status(HTTP_STATUS.OK)
                        .cookie("accessToken", accessToken, COOKIE_OPTIONS)
                        .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.ACCEPTED,
                                        `USER CONTROLLER, LOGIN, User {${userInstance._id}: ${userInstance.userName}} logged in successfully.`,
                                        {
                                                user: userInstance,
                                                accessToken,
                                                refreshToken,
                                        }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.UNAUTHORIZED,
                        error.message ||
                                "USER CONTROLLER, REFACC TOKEN, CATCH, Invalid token provided.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Reset an existing user's Password.
 * @route 	PATCH /reset-password
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user Current and New Passwords.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with new Password creation confirmation.
 */
const changeCurrentPassword = asyncHandler(async (req, res) => {
        try {
                const { currPass, newPass } = req.body;

                const userInstance = await User.findById(req.user?._id).select(
                        "+password +refreshToken"
                );
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, CHANGE CURR PASS, User details INVALID."
                        );
                }

                const isPassCorrect =
                        await userInstance.comparePassword(currPass);
                if (!isPassCorrect) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, CHANGE CURR PASS, INVALID current password."
                        );
                }

                userInstance.password = newPass;
                await userInstance.save({ validateBeforeSave: false });

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, CHANG CURR PASS, User ${userInstance.userName} password updated successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, CHANGE CURR PASS, CATCH, An error occurred while changing the user password.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Get an existing user's details.
 * @route 	GET /currentUser
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user details added via Auth middleware.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the curret active/logged-in user details.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
        try {
                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, GET CURR USER, User ${req.user.userName} fetched successfully.`,
                                        req.user
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, GET CURR USER, CATCH, An error occurred while fetching the user.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Update an existing User's Account Details.
 * @route 	PATCH /update-userData
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user updation details.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the updated user details.
 */
const updateAccountDetails = asyncHandler(async (req, res) => {
        try {
                const { email, fullName } = req.body;
                if (!fullName && !email) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD USR DETAILS, updation fields required."
                        );
                }

                const updateFields = {
                        ...(fullName !== undefined && { fullName }),
                        ...(email !== undefined && { email }),
                };

                const updatedUser = await User.findByIdAndUpdate(
                        req.user?._id,
                        { $set: updateFields },
                        { new: true }
                );

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, UPD USR DETAILS, User ${updatedUser.userName} updated successfully.`,
                                        updatedUser
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD USR DETAILS, CATCH, An error occurred while updating user details.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Update an existing User's Avatar Details.
 * @route 	PATCH /update-avatar
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user Avatar file details added via Multer middleware.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the updated user Avatar details.
 */
const updateAvatar = asyncHandler(async (req, res) => {
        try {
                const avatarLocalPath = req.file?.path || null;
                if (!avatarLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD AVATAR, updation field required."
                        );
                }

                const avatar = await uploadOnCloud(avatarLocalPath);
                if (!avatar?.secure_url) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, UPD AVATAR, Avatar did't get upload to Cloudinary."
                        );
                }

                const userInstance = await User.findById(req.user?._id).select(
                        "avatar"
                );
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, UPD AVATAR, User details INVALID."
                        );
                }

                const oldAvatarPublicId = userInstance.avatar.public_id;
                if (!oldAvatarPublicId) {
                        console.error(
                                "USER CONTROLLER, UPD AVATAR,",
                                "Old Avatar Public ID not found."
                        );
                }

                // Deleting Old Avatar from Cloudinary.
                deleteFromCloud(oldAvatarPublicId);

                const updatedUser = await User.findByIdAndUpdate(
                        userInstance._id,
                        {
                                $set: {
                                        avatar: {
                                                public_id: avatar.public_id,
                                                secure_url: avatar.secure_url,
                                        },
                                },
                        },
                        { new: true }
                );
                if (!updatedUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, UPD AVATAR, Updated user not found."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, UPD AVATAR, User ${updatedUser.userName} Avatar updated successfully.`,
                                        updatedUser
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD AVATAR, CATCH, An error occurred while updating Avatar.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Update an existing User's Cover Image Details.
 * @route 	PATCH /update-cover-img
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user Cover Image file details added via Multer middleware.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the updated user Cover Image details.
 */
const updateCoverImage = asyncHandler(async (req, res) => {
        try {
                const coverImgLocalPath = req.file?.path || null;
                if (!coverImgLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD COVER IMG, updation field required."
                        );
                }

                const coverImg = await uploadOnCloud(coverImgLocalPath);
                if (!coverImg.secure_url) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, UPD COVER IMG, Cover Image did't get upload to Cloudinary."
                        );
                }

                const userInstance = await User.findById(req.user?._id).select(
                        "coverImage"
                );
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, UPD COVER IMG, User details INVALID."
                        );
                }

                const oldCoverImgURL = userInstance.coverImage.public_id;
                if (!oldCoverImgURL) {
                        console.error(
                                "USER CONTROLLER, UPD COVER IMG,",
                                "Old Cover Image URL not found."
                        );
                }

                // Deleting Old Cover image from Cloudinary.
                deleteFromCloud(oldCoverImgURL.public_id);

                const updatedUser = await User.findByIdAndUpdate(
                        userInstance._id,
                        {
                                $set: {
                                        coverImage: {
                                                public_id: avatar.public_id,
                                                secure_url: avatar.secure_url,
                                        },
                                },
                        },
                        { new: true }
                );
                if (!updatedUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, UPD COVER IMG, Updated user not found."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, UPD COVER IMG, User ${updatedUser.userName} Cover Image updated successfully.`,
                                        updatedUser
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD COVER IMG, CATCH, An error occurred while updating Cover image.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Populate the User details with Channel Profile's data.
 * @route 	GET /userChannelProfile/:userName
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user's UserName via Params.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the user's details along with the Channel Profile ( subscribercount, channelsSubscribedToCount, isSubscribedFlag ).
 */
const getUserChannelProfile = asyncHandler(async (req, res) => {
        try {
                const { userName } = req.params;
                if (!userName?.trim()) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, GET USR CHANNEL PROF, UserName is not available."
                        );
                }

                const userId = new Mongoose.Types.ObjectId(req?.user?._id);
                const channel = await User.aggregate([
                        // Finding User/Owner of this Channel
                        {
                                $match: {
                                        userName: userName,
                                },
                        },
                        // Creating all documents for Subscribers of this channel { Getting No. of Users that have this channel subscribedTo }
                        {
                                $lookup: {
                                        from: "subscriptions",
                                        localField: "_id",
                                        foreignField: "channel",
                                        as: "subscribers",
                                },
                        },
                        // Creating all documents for All channels this channel/user has SubscribedTo { Getting No. of Channels that have this user as subscriber }
                        {
                                $lookup: {
                                        from: "subscriptions",
                                        localField: "_id",
                                        foreignField: "subscriber",
                                        as: "subscribedTo",
                                },
                        },
                        // Adding the new fields into User model of this channels User/owner
                        {
                                $addFields: {
                                        subscribercount: {
                                                $size: "$subscribers",
                                        },
                                        channelsSubscribedToCount: {
                                                $size: "$subscribedTo",
                                        },
                                        isSubscribedFlag: {
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
                        // Flagging the fields that we want to showcase in the outcome of this query from the updated User model of this channel
                        {
                                $project: {
                                        userName: 1,
                                        email: 1,
                                        fullName: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                        subscribercount: 1,
                                        channelsSubscribedToCount: 1,
                                        isSubscribedFlag: 1,
                                },
                        },
                ]);

                if (!channel?.length) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "USER CONTROLLER, GET USR CHANNEL PROF, Channel does not exitst."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, GET USR CHANNEL PROF, Channel ${channel[0]?.userName} Profile fetched successfully.`,
                                        channel[0]
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.NOT_FOUND,
                        error.message ||
                                "USER CONTROLLER, GET USR CHANNEL PROF, CATCH, An error occurred while fetching Channel Details or maybe Channel Doesn't exrist.",
                        [error.message],
                        error.stack
                );
        }
});

/**
 * Populate the User details with Watch History data.
 * @route 	GET /watchHistory
 * @access 	Private
 *
 * @param 	{Object} req - The request object containing user details added via Auth middleware.
 * @param 	{Object} res - The response object.
 *
 * @returns 	{Object} The response object with the user's Watch History data.
 */
const getUserWatchHistory = asyncHandler(async (req, res) => {
        try {
                const userInstance = await User.aggregate([
                        {
                                $match: {
                                        _id: new Mongoose.Types.ObjectId(
                                                req?.user?._id
                                        ),
                                },
                        },
                        {
                                $lookup: {
                                        from: "videos",
                                        localField: "watchHistory",
                                        foreignField: "_id",
                                        as: "watchHistory",
                                        pipeline: [
                                                {
                                                        $lookup: {
                                                                from: "users",
                                                                localField: "owner",
                                                                foreignField:
                                                                        "_id",
                                                                as: "owner",
                                                                pipeline: [
                                                                        {
                                                                                $project: {
                                                                                        userName: 1,
                                                                                        email: 1,
                                                                                        fullName: 1,
                                                                                        avatar: 1,
                                                                                },
                                                                        },
                                                                ],
                                                        },
                                                },
                                        ],
                                },
                        },
                        {
                                $addFields: {
                                        owner: {
                                                $first: "$owner",
                                        },
                                },
                        },
                ]);

                if (!userInstance?.length) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_FOUND,
                                "USER CONTROLLER, GET USR WATCH HISTORY, user watch history doesn't exist."
                        );
                }

                return res
                        .status(HTTP_STATUS.OK)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.OK,
                                        `USER CONTROLLER, GET USR WATCH HISTORY, User ${userInstance.userName} Watch history fetched successfully.`,
                                        userInstance[0].watchHistory
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.NOT_FOUND,
                        error.message ||
                                "USER CONTROLLER, GET USR CHANNEL PROF, CATCH, An error occurred while fetching User's watch history.",
                        [error.message],
                        error.stack
                );
        }
});

export {
        loginUser,
        logoutUser,
        updateAvatar,
        registerUser,
        getCurrentUser,
        updateCoverImage,
        refreshAccessToken,
        getUserWatchHistory,
        updateAccountDetails,
        changeCurrentPassword,
        getUserChannelProfile,
};
